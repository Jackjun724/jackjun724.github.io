---
title: MySQL性能调优
tags: [MySQL,Performance]
---

# Mysql执行流程
![avatar](https://static001.geekbang.org/resource/image/0d/d9/0d2070e8f84c4801adbfa03bda1f98d9.png)

## 连接器
创建数据库连接，查询权限，8个小时没动作连接将被销毁(param:`wait_timeout`)，

建立连接的过程通常是比较复杂的，所以建议在使用中要尽量减少建立连接的动作，也就是尽量使用长连接。

但是全部使用长连接后，有些时候 MySQL 占用内存涨得特别快，这是因为 MySQL 在执行过程中临时使用的内存是管理在连接对象里面的。这些资源会在连接断开的时候才释放。所以如果长连接累积下来，可能导致内存占用太大，被系统强行杀掉（OOM），从现象看就是 MySQL 异常重启了。

可以考虑以下两种解决方案：
1. 定期断开长连接。使用一段时间，或者程序里面判断执行过一个占用内存的大查询后，断开连接，之后要查询再重连。
2. 可以在每次执行一个比较大的操作后，通过执行`mysql_reset_connection`来重新初始化连接资源。这个过程不需要重连和重新做权限验证，但是会将连接恢复到刚刚创建完时的状态 **(MySQL 5.7 或更新版本)**。

## 查询缓存
在Mysql8.0版本已经被移除，低版本中仍然保留但部分版本默认关闭，查询缓存往往弊大于利，因为每次更新都会使查询缓存失效，而导致查询缓存一直在浪费资源却没有起到实际的作用，但是查询缓存拥有按需使用模式，通过设置`query_cache_type`为`DEMAND`来启用按需。
```sql
-- 启用缓存 8.0版本以下且需要开启缓存功能
select SQL_CACHE * from T where ID=10；
```

## 分析器
分析器主要用来判断 SQL语句 是否满足 MySQL的语法。
例如
```sql
mysql> elect * from t where ID=1;

ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'elect * from t where ID=1' at line 1
```
就是在分析期间抛出的错误。

## 优化器
优化器用来决定执行顺序，比如:
```sql
select * from t1 join t2 using(ID) where t1.c=10 and t2.d=20;
```
既可以先从表 t1 里面取出 c=10 的记录的 ID 值，再根据 ID 值关联到表 t2，再判断 t2 里面 d 的值是否等于 20。

也可以先从表 t2 里面取出 d=20 的记录的 ID 值，再根据 ID 值关联到 t1，再判断 t1 里面 c 的值是否等于 10。

这两种执行方法的逻辑结果是一样的，但是执行的效率会有不同，而优化器的作用就是决定选择使用哪一个方案。

## 执行器
开始执行的时候，要先判断一下你对这个表 T 有没有执行查询的权限，如果没有，就会返回没有权限的错误。(在工程实现上，如果命中查询缓存，会在查询缓存返回结果的时候，做权限验证。查询也会在优化器之前调用 precheck 验证权限)。

## 最后
对于有索引的表，执行的逻辑也差不多。第一次调用的是“取满足条件的第一行”这个接口，之后循环取“满足条件的下一行”这个接口，这些接口都是引擎中已经定义好的。

# Mysql的事务

## 特性
1. 原子性
2. 一致性
3. 隔离性
4. 持久性

## 隔离性与隔离级别
1. 读未提交
2. 读已提交，可以解决脏读问题。
3. 可重复读，可以解决不可重复读问题。
4. 串行化，可以解决幻读问题。

其中速度由上到下为递减。

## 长事务
长事务意味着系统里面会存在很老的事务视图。由于这些事务随时可能访问数据库里面的任何数据，所以这个事务提交之前，数据库里面它可能用到的回滚记录都必须保留，这就会导致大量占用存储空间。

在 MySQL 5.5 及以前的版本，回滚日志是跟数据字典一起放在 ibdata 文件里的，即使长事务最终提交，回滚段被清理，文件也不会变小。我见过数据只有 20GB，而回滚段有 200GB 的库。最终只好为了清理回滚段，重建整个库。

可以在 information_schema 库的 innodb_trx 这个表中查询长事务，比如下面这个语句，用于查找持续时间超过 60s 的事务。

```sql
select * from information_schema.innodb_trx where TIME_TO_SEC(timediff(now(),trx_started))>60
```

## Mysql 日志
redo log 用于保证 crash-safe 能力。`innodb_flush_log_at_trx_commit` 这个参数设置成 1 的时候，表示每次事务的 redo log 都直接持久化到磁盘。这个参数我建议你设置成 1，这样可以保证 MySQL 异常重启之后数据不丢失。

### redo log 一般设置多大？
redo log 太小的话，会导致很快就被写满，然后不得不强行刷 redo log，这样 WAL 机制的能力就发挥不出来了。如果是现在常见的几个 TB 的磁盘的话，直接将 redo log 设置为 4 个文件、每个文件 1GB 吧。

`sync_binlog` 这个参数设置成 1 的时候，表示每次事务的 binlog 都持久化到磁盘。这个参数我也建议你设置成 1，这样可以保证 MySQL 异常重启之后 binlog 不丢失。

## Mysql索引
索引的出现其实就是为了提高数据查询的效率，就像书的目录一样
### 常见的索引类型
1. 哈希表，适用于K、V数据库，Memcached 及其他一些 NoSQL 引擎，适合等值查询，不支持范围查询，即`age>10 and age <20`。
2. 有序数组，在等值查询和范围查询场景中的性能就都非常优秀，频繁插入成本较高，有序数组索引只适用于静态存储引擎。
3. 搜索树，Mysql中的B+树，类似与平衡二叉树的M叉树，搜索效率为O(log<sub>M</sub>N),N为数据条数。

### 主键索引和普通索引的区别
如果语句是 `select * from T where ID=500`，即主键查询方式，则只需要搜索 ID 这棵 B+ 树；如果语句是 `select * from T where k=5`，即普通索引查询方式，则需要先搜索 k 索引树，得到 ID 的值为 500，再到 ID 索引树搜索一次。这个过程称为回表。

主键索引的叶子节点存的是**整行数据**。在 InnoDB 里，主键索引也被称为聚簇索引（clustered index）。

非主键索引的叶子节点内容是主键的值。在 InnoDB 里，非主键索引也被称为二级索引（secondary index）

**尽量使用主键索引进行查询防止回表**

可以通过联合索引来优化回表问题，例如联合索引name、age，其中SQL语句`select name from T where age>18`不用进行回表查询，因为叶子节点中记录着两个字段的信息。

## 索引维护
Q：什么时候适合使用非主键自增值索引？

A：在只有一个索引的情况下，且该索引是唯一索引，即典型的KV场景，但同时要考虑K的大小，例如Key是varchar(50)，那么相比int的4byte，大小，显然更加浪费存储空间。

**从性能和存储空间方面考量，自增主键往往是更合理的选择。**

## 最左前缀原则

这里的评估标准是，索引的复用能力。因为可以支持最左前缀，所以当已经有了 (a,b) 这个联合索引后，一般就不需要单独在 a 上建立索引了。因此，第一原则是，如果通过调整顺序，可以少维护一个索引，那么这个顺序往往就是需要优先考虑采用的。

如果既有联合查询，又有基于 a、b 各自的查询，查询条件里面只有 b 的语句，是无法使用 (a,b) 这个联合索引的，这时候你不得不维护另外一个索引，也就是说你需要同时维护 (a,b)、(b) 这两个索引。

## 索引下推优化
MySQL 5.6 引入的索引下推优化，在索引遍历过程中，对索引中包含的字段先做判断，直接过滤掉不满足条件的记录，减少回表次数。

# Mysql 锁
**根据加锁的范围，MySQL 里面的锁大致可以分成全局锁、表级锁和行锁三类**

## 全局锁
全局锁就是对整个数据库实例加锁。MySQL 提供了一个加全局读锁的方法，命令是 Flush tables with read lock (FTWRL)。当你需要让整个库处于只读状态的时候，可以使用这个命令，之后其他线程的以下语句会被阻塞：数据更新语句（数据的增删改）、数据定义语句（包括建表、修改表结构等）和更新类事务的提交语句。**全局锁的典型使用场景是，做全库逻辑备份。**，为保证数据一致性的情况下备份，即一个业务同时更新A、B两个表，防止备份只备A表而漏掉B表。当然，也可以通过可重复读的隔离级别来保证视图一致性。不过要保证引擎是InnoDB，如果引擎是MyISAM就需要使用FTWRL命令了。

Tips：官方自带的逻辑备份工具是 mysqldump。当 mysqldump 使用参数–single-transaction 的时候，导数据之前就会启动一个事务，来确保拿到一致性视图。但是因为事务问题，single-transaction 方法只适用于所有的表使用事务引擎的库。如果有的表使用了不支持事务的引擎，那么备份就只能通过 FTWRL 方法。

### 既然要全库只读，为什么不使用 `set global readonly=true` 的方式呢？

1. 在有些系统中，readonly 的值会被用来做其他逻辑，比如用来判断一个库是主库还是备库。因此，修改 global 变量的方式影响面更大.

2. 在异常处理机制上有差异。如果执行 FTWRL 命令之后由于客户端发生异常断开，那么 MySQL 会自动释放这个全局锁，整个库回到可以正常更新的状态。而将整个库设置为 readonly 之后，如果客户端发生异常，则数据库就会一直保持 readonly 状态，这样会导致整个库长时间处于不可写状态，风险较高。

## 表级锁
MySQL 里面表级别的锁有两种：一种是**表锁**，一种是**元数据锁**（meta data lock，MDL)。

表锁的语法是 `lock tables … read/write`。与 FTWRL 类似，可以用 `unlock tables` 主动释放锁，也可以在客户端断开的时候自动释放。**需要注意，lock tables 语法除了会限制别的线程的读写外，也限定了本线程接下来的操作对象。**

举个例子, 如果在某个线程 A 中执行 lock tables t1 read, t2 write; 这个语句，则其他线程写 t1、读写 t2 的语句都会被阻塞。同时，线程 A 在执行 unlock tables 之前，也只能执行读 t1、读写 t2 的操作。连写 t1 都不允许，自然也不能访问其他表。

**另一类表级的锁是 MDL（metadata lock)**。MDL 不需要显式使用，在访问一个表的时候会被自动加上。MDL 的作用是，保证读写的正确性。

在 MySQL 5.5 版本中引入了 MDL，当对一个表做增删改查操作的时候，加 MDL 读锁；当要对表做结构变更操作的时候，加 MDL 写锁。

- 读锁之间不互斥，因此你可以有多个线程同时对一张表增删改查。

- 读写锁之间、写锁之间是互斥的，用来保证变更表结构操作的安全性。因此，如果有两个线程要同时给一个表加字段，其中一个要等另一个执行完才能开始执行。

> 注意：因为MDL锁读锁不阻塞，写锁阻塞，可能会导致长事务读锁阻塞写锁同时写锁阻塞后面的读锁导致产生问题，所以可以在 MySQL 的 information_schema 库的 innodb_trx 表中查到当前执行中的事务。如果你要做 DDL 变更的表刚好有长事务在执行，要考虑先暂停 DDL，或者 kill 掉这个长事务。但是如果该表是个热点表，kill可能未必管用，可以尝试设置alter table 设定等待超时时间，之后手动尝试。MariaDB 已经合并了 AliSQL 的这个功能，所以这两个开源分支目前都支持 DDL NOWAIT/WAIT n 这个语法。


> 注意：在支持事务的表中尽量使用事务而不是表锁来保证数据一致性。

## 行级锁
Mysql的行级锁由各个引擎实现，但并非所有的引擎都支持行级锁，例如MyISAM就不支持行级锁，常用的行级锁引擎有InnoDB

### 两阶段锁

**在 InnoDB 事务中，行锁是在需要的时候才加上的，但并不是不需要了就立刻释放，而是要等到事务结束时才释放。这个就是两阶段锁协议。** 如果你的事务中需要锁多个行，要把最可能造成锁冲突、最可能影响并发度的锁尽量往后放。比如事务A中有update、update、insert语句，更优的执行顺序应该是insert、update、update，让后两个update锁住行的时间尽可能的减少，用来提升应用的并发。

### 死锁和死锁检测

![lock](https://static001.geekbang.org/resource/image/4d/52/4d0eeec7b136371b79248a0aed005a52.jpg)

例如上面这个情况，就发生了死锁，事务A的第二条DML语句在等待事务B的第一条DML语句释放id=2的行锁，而事务B同时也在等待事务A释放id=1的行锁，导致两个事务相互锁死。

解决办法：
- 直接进入等待，直到超时。这个超时时间可以通过参数 innodb_lock_wait_timeout 来设置。
- 发起死锁检测，发现死锁后，主动回滚死锁链条中的某一个事务，让其他事务得以继续执行。将参数 `innodb_deadlock_detect`(Mysql 8.0) 设置为 on，表示开启这个逻辑。

第一种解决办法的默认超时时间为50秒。调低超时时间容易会产生“误伤”的情况，例如某些 事务在进行锁等待，结果被意外回滚。所以通常要采用第二种策略。但是在高并发的情况下，假设有一万个请求过来同时更新同一行数据，那么每个更新都会判断会不会因为自己而发生死锁，虽然最终检测的结果是没有死锁，但是这期间要消耗大量的 CPU 资源。因此，可能就会看到 CPU 利用率很高，但是每秒却执行不了几个事务。

**怎么解决由这种热点行更新导致的性能问题呢？**
- **如果你能确保这个业务一定不会出现死锁，可以临时把死锁检测关掉。** 但是这种操作本身带有一定的风险，因为业务设计的时候一般不会把死锁当做一个严重错误，毕竟出现死锁了，就回滚，然后通过业务重试一般就没问题了，这是业务无损的。而关掉死锁检测意味着可能会出现大量的超时，这是业务有损的。

- 另一个思路是控制并发度。在分布式项目中往往都是集群部署，所以建议在中间件中实现或者修改Mysql的源码。
- 也可以考虑通过将一行改成逻辑上的多行来减少锁冲突。还是以影院账户为例，可以考虑放在多条记录上，比如 10 个记录，影院的账户总额等于这 10 个记录的值的总和。这样每次要给影院账户加金额的时候，随机选其中一条记录来加。这样每次冲突概率变成原来的 1/10，可以减少锁等待个数，也就减少了死锁检测的 CPU 消耗。但这样会加重占用空间的负担。而且在做一些减法操作的时候，甚至可能需要操作多行的业务逻辑。


## 视图
在 MySQL 里，有两个“视图”的概念：
- 一个是 view。它是一个用查询语句定义的虚拟表，在调用的时候执行查询语句并生成结果。创建视图的语法是 create view … ，而它的查询方法与表一样。
- 另一个是 InnoDB 在实现 MVCC 时用到的一致性读视图，即 consistent read view，用于支持 RC（Read Committed，读提交）和 RR（Repeatable Read，可重复读）隔离级别的实现。

## 事务的启动时机
**begin/start transaction 命令并不是一个事务的起点，在执行到它们之后的第一个操作 InnoDB 表的语句，事务才真正启动。** 如果你想要马上启动一个事务，可以使用 `start transaction with consistent snapshot` 这个命令。

在实现上， InnoDB 为每个事务构造了一个数组，用来保存这个事务启动瞬间，当前正在“活跃”的所有事务 ID。“活跃”指的就是，启动了但还没提交。数组里面事务 ID 的最小值记为低水位，当前系统里面已经创建过的事务 ID 的最大值加 1 记为高水位。
![transcation](https://static001.geekbang.org/resource/image/88/5e/882114aaf55861832b4270d44507695e.png)

## 事务间的规定
MVCC(Multiversion concurrency control)中的可重复读事务实现：当事务A的版本id为100，在版本id为101的B事务更新了id=1的行数据，那么事务A 执行update的时候，会去读取当前值，即101版本修改后的值，在update后的select读取到的值不在是100版本，而是102版本，即本事务修改后的值，这一规定是防止B事务的更新丢失。**更新数据都是先读后写的，而这个读，只能读当前的值，称为“当前读”（current read）。** 除了 update 语句外，select 语句如果加锁，也是当前读。

读提交的逻辑和可重复读的逻辑类似，它们最主要的区别是：
 - 在可重复读隔离级别下，只需要在事务开始的时候创建一致性视图，之后事务里的其他查询都共用这个一致性视图；
 - 在读提交隔离级别下，每一个语句执行前都会重新算出一个新的视图。

`start transaction with consistent snapshot`的意思是从这个语句开始，创建一个持续整个事务的一致性快照。而在读提交隔离级别下，这个用法就没意义了，等效于普通的 `start transaction`。

> 注意： 在update的语句没有实际更新到行的时候不会更新每一行数据的trx_id

# Mysql的读写
InnoDB 的数据是按数据页为单位来读写的，当需要读一条记录的时候，并不是将这个记录本身从磁盘读出来，而是以页为单位，将其整体读入内存。也就是说，当你查询相邻的数据，往往只是一次IO访问，在 InnoDB 中，每个数据页的大小默认是 16KB。

# 普通索引和唯一索引

## 查询过程
普通索引和唯一索引的查询性能几乎相同，select id from T where k=1，普通索引在查找到第一个满足结果的时候会再去查找下个结果，由于B+树的性质，如果字段唯一，再查找的性能损耗也并不会消耗太多，而唯一索引会在查找到第一个结果的时候直接返回，二者差距微乎其微。

## 更新过程
因为普通索引会利用到change buffer（低版本为insertBuffer，仅支持insert）。而唯一索引会为了判断是否重复而进行IO操作，直接进行更新，而不利用change buffer 的缓冲功能。所以在更新的情况下，普通索引相对于唯一索引，性能会更胜一筹，在高并发写的情况下，可以尽量使用普通索引。当然，如果修改的数据刚好存在于内存中的数据页中，更新的性能差距的是不存在的。change buffer 的大小默认是buffer pool的25%，最高可以调到buffer pool的50%。

> change buufer 实际上也是可以持久化的数据。

## 如何选择？
因为change buffer会缓存更新数据，在查询数据命中的change buffer中的数据所在的数据页的时候执行插入，所以，如果每次更新都伴随这一次查询，还是建议使用唯一索引而非普通索引。

## change buffer 的使用场景
对于写多读少的业务来说，页面在写完以后马上被访问到的概率比较小，此时 change buffer 的使用效果最好。这种业务模型常见的就是账单类、日志类的系统。反过来，假设一个业务的更新模式是写入之后马上会做查询，那么即使满足了条件，将更新先记录在 change buffer，但之后由于马上要访问这个数据页，会立即触发 merge 过程。这样随机访问 IO 的次数不会减少，反而增加了 change buffer 的维护代价。所以，对于这种业务模式来说，change buffer 反而起到了副作用。


# 优化器的逻辑
选择索引是优化器的工作，而优化器选择索引的目的是找到一个最优的执行方案，并用最小的代价去执行，在数据库里面，选择索引会结合扫描行数、是否使用临时表、是否排序等因素进行综合判断。可以通过`explain`来查看优化器的选择。

## 优化器怎么判断扫描行数？
Mysql根据统计信息估算记录数，统计信息就是索引的“区分度”。一个索引上不同的值越多，这个索引的区分度就越好。而一个索引上不同的值的个数，我们称之为“基数”（cardinality）。也就是说，这个基数越大，索引的区分度越好。可用通过`show index from table_name`来查看索引的基数。但索引基数并非精确值，而是从数据页中抽样统计出来的，即选取N个数据页求得平均值然后乘以数据页个数。数据表持续更新，索引的统计信息也会发生改变，当变更的数据行数超过 1/M 的时候，会自动触发重新做一次索引统计。也可以通过`analyze table table_name`来进行重新计算。

在 MySQL 中，有两种存储索引统计的方式，可以通过设置参数 innodb_stats_persistent 的值来选择：
- 设置为 on 的时候，表示统计信息会持久化存储。这时，默认的 N 是 20，M 是 10。
- 设置为 off 的时候，表示统计信息只存储在内存中。这时，默认的 N 是 8，M 是 16。


## 索引选择异常和处理
- 采用 force index 强行选择一个索引，但是如果索引改了名字，这个语句也得改，显得很麻烦。迁移数据库也可能会产生语法兼容问题。
- 可以考虑修改语句，引导 MySQL 使用我们期望的索引。但是往往修改都会影响到Sql语句的语义，且不具备通用性。
- 可以新建一个更合适的索引，或者删除误用的索引，但一般经过 DBA 索引优化过的库，找到一个更合适的索引一般比较难。所以可以考虑删除误导的索引。

# 字符串索引的选择
对于常用的字符串列，我们可能经常需要将其作为where的条件，但往往字符串索引会占据更多的空间，增重索引负担，所以我们可以通过**前缀索引** 来优化。

## 前缀索引
前缀索引`alter table tableName add index indexName(columnName(6));`，其中数字6是前缀索引的长度，可以自定义，不填则将整个字符串作为索引，前缀索引的工作原理是利用字符串的前N的字符进行索引，然后根据搜索出来的数据再进行回表搜索判断。选择前缀索引要取舍字符串长度和索引列的辨识度，辨识度越低的列查询回表次数会越高。可以通过
```sql
select 
  count(distinct left(columnName,4)）as L4, 
  count(distinct left(columnName,5)）as L5, 
  count(distinct left(columnName,6)）as L6, 
  count(distinct left(columnName,7)）as L7 
  ...
from tableName;
```
来选择前缀索引的字符串长度。

## 类似身份证号这种前缀辨识度低的字符串
类似身份证号这种字符串，同一地区前六位都是相同的，数据辨识率相当低，MySQL又没有所谓的后缀索引，引用前缀12个字符又显得相当浪费，应该怎么办呢？

- 使用倒序存储。如果你存储身份证号的时候把它倒过来存，每次查询的时候，你可以这么写：`where id_card = reverse('input_id_card_string')`。
- 新增hash字段，在插入的时候对身份证号进行hash，例如使用crc32 function。

两者的优劣显而易见，hash具有更高的辨识度但却占用了更多空间，且hash函数的资源浪费是大于reverse函数的。

# 引发MySQL偶尔很慢的原因
平时执行很快的更新操作，其实就是在写内存和日志，而 MySQL 偶尔“卡”一下的那个瞬间，可能就是在刷脏页（flush）。

## 什么时候会刷脏页呢
 1. InnoDB 的 redo log 写满了。这时候系统会停止所有更新操作，把 checkpoint 往前推进，redo log 留出空间可以继续写。
 2. 数据库发生大量插入，系统内存不足以添加新的内存页，就要淘汰一些旧的内存页，而这些脏内存页就是要flush。
 3. MySQL认为系统空闲的时候，会自动的刷脏页。
 4. MySQL正常关闭的时候也会进行刷脏，可以令下次启动速度加快。

第三第四种情况通常不会影响数据库性能问题，而第一种情况是应该被避免的问题，在系统flush redo log 的时候，会阻塞所有更新操作。

第二种情况就要细分内存中的数据页的情况了，内存中的数据页包含以下几种情况。
- 还没有使用的数据页。
- 使用了并且是干净页，这种数据页可以直接淘汰后被重复利用。
- 使用了并且是脏页，当数据涉及到脏页时就要被flush。

当要读入的数据页没有在内存的时候，就必须到缓冲池中申请一个数据页。这时候只能把最久不使用的数据页从内存中淘汰掉：如果要淘汰的是一个干净页，就直接释放出来复用；但如果是脏页呢，就必须将脏页先刷到磁盘，变成干净页后才能复用。

刷脏页虽然是常态，但是出现以下这两种情况，都是会明显影响性能的：
1. 一个查询要淘汰的脏页个数太多，会导致查询的响应时间明显变长；
2. 日志写满，更新全部堵住，写性能跌为 0，这种情况对敏感业务来说，是不能接受的。

## InnoDB 脏页的控制策略，以及相关的参数。
- `innodb_io_capacity` :  InnoDB 磁盘全力刷脏页能力。这个值建议设置成磁盘的 IOPS。磁盘的 IOPS 可以通过 fio 这个工具来测试(执行命令：`fio -filename=$filename -direct=1 -iodepth 1 -thread -rw=randrw -ioengine=psync -bs=16k -size=500M -numjobs=10 -runtime=10 -group_reporting -name=mytest`) macOS 19Pro SSD测试值在2500，通常SSD都会在2000左右。
- `innodb_max_dirty_pages_pct`: 脏页比例上限，默认值是 75%。虽然已经定义了“全力刷脏页”的行为，但平时总不能一直是全力刷。InnoDB 怎么控制引擎按照“全力”的百分比来刷脏页。

一旦一个查询请求需要在执行过程中先 flush 掉一个脏页时，这个查询就可能要比平时慢了。而 MySQL 中的一个机制，可能让查询会更慢：在准备刷一个脏页的时候，如果这个数据页旁边的数据页刚好是脏页，就会把这个“邻居”也带着一起刷掉；而且这个把“邻居”拖下水的逻辑还可以继续蔓延，也就是对于每个邻居数据页，如果跟它相邻的数据页也还是脏页的话，也会被放到一起刷。

在 InnoDB 中，`innodb_flush_neighbors` 参数就是用来控制这个行为的，值为 1 的时候会有上述的“连坐”机制，值为 0 时表示不找邻居，自己刷自己的。

找“邻居”这个优化在机械硬盘时代是很有意义的，可以减少很多随机 IO。机械硬盘的随机 IOPS 一般只有几百，相同的逻辑操作减少随机 IO 就意味着系统性能的大幅度提升。而如果使用的是 SSD 这类 IOPS 比较高的设备的话，我就建议你把 `innodb_flush_neighbors` 的值设置成 0。因为这时候 IOPS 往往不是瓶颈，而“只刷自己”，就能更快地执行完必要的刷脏页操作，减少 SQL 语句响应时间。在 MySQL 8.0 中，`innodb_flush_neighbors` 参数的默认值已经是 0 了。

# 表数据与表空间
一个 InnoDB 表包含两部分。
- 表结构定义
- 数据

在 MySQL 8.0 版本以前，表结构是存在以.frm 为后缀的文件里。而 MySQL 8.0 版本，则已经允许把表结构定义放在系统数据表中了。因为表结构定义占用的空间很小。

其中，表数据既可以存在共享表空间里，也可以是单独的文件。这个行为是由参数 `innodb_file_per_table` 控制的。这个参数设置为 OFF 表示表的数据放在系统共享表空间，也就是跟数据字典放在一起；这个参数设置为 ON 表示每个 InnoDB 表数据存储在一个以`.ibd`为后缀的文件中。

从 MySQL 5.6.6 版本开始，它的默认值就是 ON 了。建议无论在任何情况下都将此选项设置为ON，可以方便管理表数据，在drop table时，如果表空间是共享数据，那么表空间依然不会得到释放，而单个数据文件的情况下会被直接删除。

但是我们删除单个记录，就会出现很多种情况，我们已经知道MySQL的数据是按数据页进行保存（由于B+数的性质）。当我们删除了单个数据页时，可能出现两种情况：
1. 删除单个数据后，数据页不为空，假设当前数据页的数据范围在id  between 100,200之间。那么当数据删除后，又重新添加id为100-200之间的数据，会重复利用数据页上的空间，但是数据页上的空间并不会因为数据被删除而减小文件大小。
2. 删除单个数据后，数据页为空，此时数据页是游离态，可被复用，但仍然不会从磁盘中释放出空间，当需要使用新的数据页时，该数据页将会被复用。
3. 如果相邻的两个数据页的利用率都很小的，MySQL会将数据页的内容进行合并，从而释放出一个游离的可复用的数据页。
  
同样，因为B+树的原因，数据在大量新增和删除以后，B+树的数据页中会存在大量空缺，这往往是因为添加的时候造成页分裂，或者删除的时候导致页的空缺，从而使得B+树利用不够充分，产生空洞，过多的浪费内存空间。

为了去除大量增删表中的数据空洞，可以尝试重建表并将数据克隆过去来优化本地磁盘上的数据文件大小。有以下解决方案：
- `alter table A engine=InnoDB`，在MySQL5.5版本之前，MySQL 会自动完成转存数据、交换表名、删除旧表的操作。因为这个操作是DDL操作，会给表加上MDL写锁，导致整个表的更新被阻塞，并非一个Online操作，在生产环境往往无法使用。
- 5.6版本以后，MySQL将这个操作改成Online DDL操作，这个操作在刚开始的时候会获取MDL写锁，但是在真正拷贝数据的时候，会降级为MDL读锁，然后将原来表的所有操作都记录在rowlog中，在同步完成后，将rowlog重新写入到新表中。但是这个操作相当消耗磁盘IO和CPU，如果是线上服务，推荐使用Github上开源的相关项目，例如gh-ost

# MySQL中的count操作
count可以说是平时查询相较于使用比较频繁的函数了。萝卜青菜，各有所爱，有的人喜欢使用`count(*)` 、有的人喜欢使用`count(1)`、`count(id)`等等。

## count的执行流程
平时不了解可能会认为count会在数据内部中有个计数，查询的时候直接返回，实则并非这样，在MyISAM这种非事务的引擎中，count确实有计数，但是在InnoDB这种事务引擎中，count并不能在复杂的事务场景下计数，往往都是遍历整表来进行计数。count遍历整表，当表中数据量过亿时，整表的遍历就会相当的慢了，如果仍要用到该表的count数据，可以通过别的手段来实现，例如在业务逻辑中为添加操作执行一个专门用来计数的count表，令其数据+1，但是这个数据并不可以在Redis这些缓存数据库当中

## 如何去优化count问题？
- 在数据量相当大且需要经常统计行数的表，建议使用事务（在对表进行增加或者删除的时候同时更新另一个统计表的数据），reids不适用在此场景下不适应，一是会存在Redis宕机的情况导致数据不准确，二是因为事务回滚问题可能会导致数据不准确。（分布式事务问题，尽可能避免，redis先+1可能会产生数据库回滚，redis后+1可能会在插入数据的一瞬间进行统计）
所以此场景下尽可能的去使用数据库事务，利用一致性视图来保证数据准确。

- 在一些不经常统计的表中，给出每种count的性能比较 `count(字段)<count(主键 id)<count(1)≈count(*)` ，即 count(*) 和 count(1)性能最优，count(*)经过mysql的优化，而count(1)每遍历一行就填充一个1，count(id)每遍历一行要取出id进行填充，所以尽可能的避免使用前两者。

# Order By
分析排序我们可以通过命令`explain`来分析Extra中的信息，其中`Using filesort` 表示需要排序，MySQL 会给每个线程分配一块内存用于排序，称为 sort_buffer。

## Sort Buffer
按字段排序，可能在内存中排序，也可能在文件中排序，这取决于排序字段的大小和`sort_buffer_size`

```sql

/* 打开optimizer_trace，只对本线程有效 */
SET optimizer_trace='enabled=on'; 

/* @a保存Innodb_rows_read的初始值 */
select VARIABLE_VALUE into @a from  performance_schema.session_status where variable_name = 'Innodb_rows_read';

/* 执行语句 */
select city, name,age from t where city='杭州' order by name limit 1000;

/* 查看 OPTIMIZER_TRACE 输出 */
SELECT * FROM `information_schema`.`OPTIMIZER_TRACE`\G

/* @b保存Innodb_rows_read的当前值 */
select VARIABLE_VALUE into @b from performance_schema.session_status where variable_name = 'Innodb_rows_read';

/* 计算Innodb_rows_read差值 */
select @b-@a;
```
这个方法是通过查看 `OPTIMIZER_TRACE` 的结果来确认的，你可以从 `number_of_tmp_files` 中看到是否使用了临时文件。如果该参数显示为`0`，则意味排序在SortBuffer 中进行，并没有用到磁盘文件作为辅助排序。其中`sort_buffer_size`越小，需要分成的份数越多`number_of_tmp_files`的值就越大。

当使用外部文件排序的时候，一般会使用归并排序算法。MySQL会把这些数据分成若干份，然后把这些有序文件合并成一个大的有序文件。

**这里需要注意的是，为了避免对结论造成干扰**，请把 `internal_tmp_disk_storage_engine` 设置成 `MyISAM`。否则，`select @b-@a` 的结果会显示为 `4001`。这是因为查询 `OPTIMIZER_TRACE` 这个表时，需要用到临时表，而 `internal_tmp_disk_storage_engine` 的默认值是 `InnoDB`。如果使用的是 `InnoDB` 引擎的话，把数据从临时表取出来的时候，会让 `Innodb_rows_read` 的值加 1。

如果你的SQL语句查询的单行数据量过大，会让sort buffer的实际利用率降低，MySQL此时会采用rowid来进行查询，可以通过`SET max_length_for_sort_data = 16;`来调控这个阀值，其中单位是byte，整型=4byte。当使用rowid（通常是主键id），需要通过索引回表查询数据。

如果sort buffer 足够大，MySQL通常会采用全字段排序，而不是rowid排序，这也就体现了 MySQL 的一个设计思想：**如果内存够，就要多利用内存，尽量减少磁盘访问。**

如果这个排序能使用的到索引，基于B+树的性质，显然就不需要排序了，查询出来的数据本身就是具有顺序的，而如果使用的覆盖索引，甚至不用回表查询。

# 常见的索引失效的情况
- **条件字段函数操作** ，例如对列执行了一些转换函数，在通常情况，应该考虑条件参数是否可以被转换，而不是去转换条件列。因为函数操作会破坏索引的有序性。
- **隐式类型转换** ，常见的隐式类型转例如：`where name=123`，这样的数据，MySQL会将name字段CAST INT，而不是将123转为String。比较的原则是优先将字符串转换为数字，所以`where id="123"`并不会导致索引失效。
- **隐式的编码转换** ， 通常在连表查询的时候，会产生这种情况，例如表A的name字段的编码是`utf8`，而表B的那么字段是`utf8mb4`，那么就会导致索引在连表的时候失效。其中`utf8mb4`是MySQL为了修复某些字的BUG的编码，在设计数据库的时候应当总是使用`utf8mb4`而非`utf8`。

总的来说，当你破坏索引的有序性的时候，优化器就决定放弃走树搜索功能。
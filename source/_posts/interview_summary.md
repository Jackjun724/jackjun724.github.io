---
title: 面试问题备忘录
tags: 面试宝典
date: 2021-03-16
---



## 后端
只记录一些常见的一些状态，因为比较多容易忘。

### 线程状态
- **初始(NEW)**：新创建了一个线程对象，但还没有调用start()方法。
- **运行(RUNNABLE)**：Java线程中将就绪（ready）和运行中（running）两种状态笼统的称为“运行”。线程对象创建后，其他线程(比如main线程）调用了该对象的start()方法。该状态的线程位于可运行线程池中，等待被线程调度选中，获取CPU的使用权，此时处于就绪状态（ready）。就绪状态的线程在获得CPU时间片后变为运行中状态（running）。
- **阻塞(BLOCKED)**：表示线程阻塞于锁。
- **等待(WAITING)**：进入该状态的线程需要等待其他线程做出一些特定动作（通知或中断）。
- **超时等待(TIMED_WAITING)**：该状态不同于WAITING，它可以在指定的时间后自行返回。
- **终止(TERMINATED)**：表示该线程已经执行完毕。

![Interview 001](https://user-images.githubusercontent.com/38455717/111280351-ad7f5c00-8676-11eb-8a80-f275ed4108fb.png)

### AQS
- [美团技术博客AQS](https://tech.meituan.com/2019/12/05/aqs-theory-and-apply.html)
- [某大佬博客AQS](https://javadoop.com/post/AbstractQueuedSynchronizer)

### 事务类型
|隔离级别|脏读（Dirty Read）|不可重复读（NonRepeatable Read）|幻读（Phantom Read）|
|---|---|---|---|
|未提交读（Read uncommitted）|❌|❌|❌
|已提交读（Read committed）  |✅|❌|❌
|可重复读（Repeatable read） |✅|✅|❌
|可串行化（Serializable ）   |✅|✅|✅
❌代表可能出现，✅代表不可能出现

### 事务的ACID
- 原子性（atomicity）
- 一致性（consistency）
- 隔离性（isolation）
- 持久性（durability）

### 事务传播
|事务传播行为类型|说明|
|--|--|
|PROPAGATION_REQUIRED|如果当前没有事务，就新建一个事务，如果已经存在一个事务中，加入到这个事务中。这是最常见的选择。|
|PROPAGATION_SUPPORTS|支持当前事务，如果当前没有事务，就以非事务方式执行。|
|PROPAGATION_MANDATORY|使用当前的事务，如果当前没有事务，就抛出异常。|
|PROPAGATION_REQUIRES_NEW|新建事务，如果当前存在事务，把当前事务挂起。|
|PROPAGATION_NOT_SUPPORTED|以非事务方式执行操作，如果当前存在事务，就把当前事务挂起。|
|PROPAGATION_NEVER|以非事务方式执行，如果当前存在事务，则抛出异常。|
|PROPAGATION_NESTED|如果当前存在事务，则在嵌套事务内执行。如果当前没有事务，则执行与PROPAGATION_REQUIRED类似的操作。|
            
### Innodb锁
[Innodb中的事务隔离级别和锁的关系](https://tech.meituan.com/2014/08/20/innodb-lock.html)

### Java IO
![image](https://user-images.githubusercontent.com/38455717/111279432-a86ddd00-8675-11eb-82ec-295b10e6c5d2.png)

## 前端(待更新)


## 运维(待更新)

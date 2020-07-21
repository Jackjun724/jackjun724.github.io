---
title: Java并发编程
tags: [MySQL,Performance]
---

# 并发编程大纲
[分工、协作、互斥](https://www.edrawsoft.cn/viewer/public/s/58584187260790)

# 并发问题三大源头
## 可见性
- 问题原因 ： 由于CPU缓存导致的可见性问题，多个线程同时操作一个共享变量由于存在CPU缓存，可能导致更新失效。

- 解决办法 ： 使用volatile关键字，底层由Java屏障支持，禁止汇编指令优化，禁用该变量CPU缓存。

## 原子性
- 问题原因： 由于CPU上下文调度，而导致一组操作非原子化，进而引发的并发问题。

- 解决办法： 使操作原子化，可以用Lock、Synchronized、CAS等一些并发工具实现。

## 有序性
- 问题原因： Java对代码进行汇编优化，导致代码并没有按我们想象的顺序执行（因为遵守Happens-Before原则，后面的行总在前面的行执行，这里是说同一行代码）

- 解决办法： 加锁

# Java内存模型（JMM）
> Java 内存模型规范了 JVM 如何提供按需禁用缓存和编译优化的方法。具体来说，这些方法包括 volatile、synchronized 和 final 三个关键字，以及六项 Happens-Before 规则

### Happens-Before 

#### 顺序性规则：
这条规则是指在一个线程中，按照程序顺序，前面的操作 Happens-Before 于后续的任意操作。

#### volatile 变量规则
这条规则是指对一个 volatile 变量的写操作， Happens-Before 于后续对这个 volatile 变量的读操作。

#### 传递性规则
这条规则是指如果 A Happens-Before B，且 B Happens-Before C，那么 A Happens-Before C。

#### 管程中锁的规则
这条规则是指对一个锁的解锁 Happens-Before 于后续对这个锁的加锁。

#### 线程 start() 规则
这条是关于线程启动的。它是指主线程 A 启动子线程 B 后，子线程 B 能够看到主线程在启动子线程 B 前的操作。

#### 线程 join() 规则
是指主线程 A 等待子线程 B 完成（主线程 A 通过调用子线程 B 的 join() 方法实现），当子线程 B 完成后（主线程 A 中 join() 方法返回），主线程能够看到子线程的操作。

#### final变量 
final 修饰变量时，初衷是告诉编译器：这个变量生而不变，可以使劲儿优化。

### Ref
[Java内存模型FAQ](http://ifeve.com/jmm-faq/)

# 死锁

## 产生死锁的情况
只有以下这四个条件都发生时才会出现死锁：
1. 互斥，共享资源 X 和 Y 只能被一个线程占用；
2. 占有且等待，线程 T1 已经取得共享资源 X，在等待共享资源 Y 的时候，不释放共享资源 X；
3. 不可抢占，其他线程不能强行抢占线程 T1 占有的资源；
4. 循环等待，线程 T1 等待线程 T2 占有的资源，线程 T2 等待线程 T1 占有的资源，就是循环等待。

## 破坏死锁
反过来分析，也就是说只要我们破坏其中一个死锁条件，就可以成功避免死锁的发生。其中，互斥这个条件我们没有办法破坏，因为我们用锁为的就是互斥。

1. 对于`占用且等待`，我们可以一次性申请所有的资源。
2. 对于`不可抢占`，占用部分资源的线程进一步申请其他资源时，如果申请不到，可以主动释放它占有的资源。
3. 对于`循环等待`，可以靠按序申请资源来预防。所谓按序申请，是指资源是有线性顺序的，申请的时候可以先申请资源序号小的，再申请资源序号大的。

# 线程饥饿 与 活锁
> 但**有时线程虽然没有发生阻塞，但仍然会存在执行不下去的情况，这就是所谓的“活锁”。** 可以类比现实世界里的例子，路人甲从左手边出门，路人乙从右手边进门，两人为了不相撞，互相谦让，路人甲让路走右手边，路人乙也让路走左手边，结果是两人又相撞了。这种情况，基本上谦让几次就解决了，因为人会交流啊。可是如果这种情况发生在编程世界了，就有可能会一直没完没了地“谦让”下去，成为没有发生阻塞但依然执行不下去的“活锁”。解决“活锁”的方案很简单，谦让时，尝试等待一个随机的时间就可以了。例如上面的那个例子，路人甲走左手边发现前面有人，并不是立刻换到右手边，而是等待一个随机的时间后，再换到右手边；同样，路人乙也不是立刻切换路线，也是等待一个随机的时间再切换。由于路人甲和路人乙等待的时间是随机的，所以同时相撞后再次相撞的概率就很低了。“等待一个随机时间”的方案虽然很简单，却非常有效，Raft 这样知名的分布式一致性算法中也用到了它。

> **所谓“饥饿”指的是线程因无法访问所需资源而无法执行下去的情况。**“不患寡，而患不均”，如果线程优先级“不均”，在 CPU 繁忙的情况下，优先级低的线程得到执行的机会很小，就可能发生线程“饥饿”；持有锁的线程，如果执行的时间过长，也可能导致“饥饿”问题。解决“饥饿”问题的方案很简单，有三种方案：一是保证资源充足，二是公平地分配资源，三就是避免持有锁的线程长时间执行。这三个方案中，方案一和方案三的适用场景比较有限，因为很多场景下，资源的稀缺性是没办法解决的，持有锁的线程执行的时间也很难缩短。倒是方案二的适用场景相对来说更多一些。

## 尽量使用notifyAll而非notify
**notify() 是会随机地通知等待队列中的一个线程，而 notifyAll() 会通知等待队列中的所有线程。** 从感觉上来讲，应该是 notify() 更好一些，因为即便通知所有线程，也只有一个线程能够进入临界区。但那所谓的感觉往往都蕴藏着风险，实际上使用 notify() 也很有风险，它的风险在于可能导致某些线程永远不会被通知到。

# 竞态条件（Race Condition）
**竞态条件，指的是程序的执行结果依赖线程执行的顺序。** 竞态条件的解决方案就是`互斥`。


# 锁的性能
**S=1/((1−p)+p/n)**

​ 
公式里的 n 可以理解为 CPU 的核数，p 可以理解为并行百分比，那（1-p）就是串行百分比

> 第一，既然使用锁会带来性能问题，那最好的方案自然就是使用无锁的算法和数据结构了。在这方面有很多相关的技术，例如线程本地存储 (Thread Local Storage, TLS)、写入时复制 (Copy-on-write)、乐观锁等；Java 并发包里面的原子类也是一种无锁的数据结构；Disruptor 则是一个无锁的内存队列，性能都非常好。

> 第二，减少锁持有的时间。互斥锁本质上是将并行的程序串行化，所以要增加并行度，一定要减少持有锁的时间。这个方案具体的实现技术也有很多，例如使用细粒度的锁，一个典型的例子就是 Java 并发包里的 ConcurrentHashMap，它使用了所谓分段锁的技术（这个技术后面我们会详细介绍）；还可以使用读写锁，也就是读是无锁的，只有写的时候才会互斥。

# 线程的状态
1. NEW（初始化状态）
2. RUNNABLE（可运行 / 运行状态）
3. BLOCKED（阻塞状态）
4. WAITING（无时限等待）
5. TIMED_WAITING（有时限等待）
6. TERMINATED（终止状态）

要注意的是：在操作系统层面，Java 线程中的 `BLOCKED`、`WAITING`、`TIMED_WAITING` 是一种状态，即前面我们提到的休眠状态。也就是说只要 Java 线程处于这三种状态之一，那么这个线程就永远没有 CPU 的使用权。

## 状态的切换

### RUNABLE 与 BLOCKED

1. `RUNNABLE` 与 `BLOCKED` 的状态转换只有一种场景会触发这种转换，就是线程等待 `synchronized` 的隐式锁。`synchronized` 修饰的方法、代码块同一时刻只允许一个线程执行，其他线程只能等待，这种情况下，等待的线程就会从 `RUNNABLE` 转换到 `BLOCKED` 状态。而当等待的线程获得 `synchronized` 隐式锁时，就又会从 `BLOCKED` 转换到 `RUNNABLE` 状态。

### RUNNABLE 与 WAITING 的状态转换

1. 第一种场景，获得 `synchronized` 隐式锁的线程，调用无参数的 `Object.wait()` 方法。其中，`wait()` 方法我们在上一篇讲解管程的时候已经深入介绍过了，这里就不再赘述。
2. 第二种场景，调用无参数的 `Thread.join()` 方法。其中的 `join()` 是一种线程同步方法，例如有一个线程对象 thread A，当调用 `A.join()` 的时候，执行这条语句的线程会等待 thread A 执行完，而等待中的这个线程，其状态会从 `RUNNABLE` 转换到 `WAITING`。当线程 thread A 执行完，原来等待它的线程又会从 `WAITING `状态转换到 `RUNNABLE`。
3. 第三种场景，调用 `LockSupport.park()` 方法。其中的 `LockSupport` 对象，也许你有点陌生，其实 Java 并发包中的锁，都是基于它实现的。调用 `LockSupport.park()` 方法，当前线程会阻塞，线程的状态会从 `RUNNABLE` 转换到 `WAITING`。调用 `LockSupport.unpark(Thread thread)` 可唤醒目标线程，目标线程的状态又会从 `WAITING` 状态转换到 `RUNNABLE`。

### RUNNABLE 与 TIMED_WAITING 的状态转换
有五种场景会触发这种转换：
1. 调用带超时参数的 Thread.sleep(long millis) 方法；
2. 获得 synchronized 隐式锁的线程，调用带超时参数的 Object.wait(long timeout) 方法；
3. 调用带超时参数的 Thread.join(long millis) 方法；
4. 调用带超时参数的 LockSupport.parkNanos(Object blocker, long deadline) 方法；
5. 调用带超时参数的 LockSupport.parkUntil(long deadline) 方法。

**TIMED_WAITING 和 WAITING 状态的区别，仅仅是触发条件多了超时参数。**

### 从 NEW 到 RUNNABLE 状态
从 NEW 状态转换到 RUNNABLE 状态很简单，只要调用线程对象的 start() 方法就可以了

### 从 RUNNABLE 到 TERMINATED 状态
线程执行完 run() 方法后，会自动转换到 TERMINATED 状态，当然如果执行 run() 方法的时候异常抛出，也会导致线程终止。

# 线程的数量
对于 I/O 密集型计算场景，最佳的线程数是与程序中 CPU 计算和 I/O 操作的耗时比相关的，可以总结出这样一个公式：

> 最佳线程数 = 1 +（I/O 耗时 / CPU 耗时）

上面这个公式是针对单核 CPU 的，至于多核 CPU，也很简单，只需要等比扩大就可以了，计算公式如下：

> 最佳线程数 =CPU 核数 * [ 1 +（I/O 耗时 / CPU 耗时）]

# Java并发包常用工具

## Lock

1. ReentrantLock 可重入锁
2. ReadWriteLock 读写锁
3. StampedLock 乐观读写锁 不支持重入 不支持条件变量 加锁时中断CPU会飙升

## 工具类
1. Semaphore 信号量 Method:acquire(),release()
2. CountDownLatch
3. CyclicBarrier Example:
```java
// 订单队列
Vector<P> pos;
// 派送单队列
Vector<D> dos;
// 执行回调的线程池 
Executor executor = 
  Executors.newFixedThreadPool(1);
final CyclicBarrier barrier =
  new CyclicBarrier(2, ()->{
    //执行完成的回调
    executor.execute(()->check());
  });
  
void check(){
  P p = pos.remove(0);
  D d = dos.remove(0);
  // 执行对账操作
  diff = check(p, d);
  // 差异写入差异库
  save(diff);
}
  
void checkAll(){
  // 循环查询订单库
  Thread T1 = new Thread(()->{
    while(存在未对账订单){
      // 查询订单库
      pos.add(getPOrders());
      // 等待
      barrier.await();
    }
  });
  T1.start();  
  // 循环查询运单库
  Thread T2 = new Thread(()->{
    while(存在未对账订单){
      // 查询运单库
      dos.add(getDOrders());
      // 等待
      barrier.await();
    }
  });
  T2.start();
}
```
4. 无锁原子类 原理：CAS (CompareAndSwap)

## 并发容器
要注意迭代器的加锁
### CopyOnWriteArrayList 
> 无锁，写复制ArrayList 适用于读多写少，且数据弱一致性。迭代器只读
### ConcurrentHashMap、ConcurrentSkipListMap
`ConcurrentHashMap` `Key`无序、`ConcurrentSkipListMap` `Key`有序。
`ConcurrentSkipListMap` 里面的 `SkipList` 本身就是一种数据结构，中文一般都翻译为“跳表”。跳表插入、删除、查询操作平均的时间复杂度是 `O(log n)`，理论上和并发线程数没有关系，所以在并发度非常高的情况下，若你对 `ConcurrentHashMap` 的性能还不满意，可以尝试一下 `ConcurrentSkipListMap`。

### CopyOnWriteArraySet 和 ConcurrentSkipListSet
与 `CopyOnWriteArrayList` 和 `ConcurrentSkipListMap` 原理相同

### Queue 单端阻塞
其实现有 `ArrayBlockingQueue`、`LinkedBlockingQueue`、`SynchronousQueue`、`LinkedTransferQueue`、`PriorityBlockingQueue` 和 `DelayQueue`

其中 `LinkedTransferQueue` 融合 `LinkedBlockingQueue` 和 `SynchronousQueue` 的功能，性能比 `LinkedBlockingQueue` 更好；`PriorityBlockingQueue` 支持按照优先级出队；`DelayQueue` 支持延时出队

### Deeue 双端阻塞
其实现是 LinkedBlockingDeque。

### Queue 单端非阻塞
其实现是 ConcurrentLinkedQueue。

### Deeue 双端非阻塞
其实现是 ConcurrentLinkedDeque。


# 异步 及 线程池
## FutureTask
```java
// 创建FutureTask
FutureTask<Integer> futureTask
  = new FutureTask<>(()-> 1+2);
// 创建并启动线程
Thread T1 = new Thread(futureTask);
T1.start();
// 获取计算结果
Integer result = futureTask.get();
```

## ThreadPoolExecutor
```java
public ThreadPoolExecutor(
  int corePoolSize,
  int maximumPoolSize,
  long keepAliveTime,
  TimeUnit unit,
  BlockingQueue<Runnable> workQueue,
  ThreadFactory threadFactory,
  RejectedExecutionHandler handler){
      //...
  } 
```

## CompletableFeature
**TIPS：默认情况下 CompletableFuture 会使用公共的 ForkJoinPool 线程池，这个线程池默认创建的线程数是 CPU 的核数（也可以通过 JVM option:-Djava.util.concurrent.ForkJoinPool.common.parallelism 来设置 ForkJoinPool 线程池的线程数）**
CompletableFeature实现了CompletionStage，具体方法可参照JavaDoc

**串行关系**
```java
CompletionStage<R> thenApply(fn);
CompletionStage<R> thenApplyAsync(fn);
CompletionStage<Void> thenAccept(consumer);
CompletionStage<Void> thenAcceptAsync(consumer);
CompletionStage<Void> thenRun(action);
CompletionStage<Void> thenRunAsync(action);
CompletionStage<R> thenCompose(fn);
CompletionStage<R> thenComposeAsync(fn);
```
**AND汇聚关系**
```java
CompletionStage<R> thenCombine(other, fn);
CompletionStage<R> thenCombineAsync(other, fn);
CompletionStage<Void> thenAcceptBoth(other, consumer);
CompletionStage<Void> thenAcceptBothAsync(other, consumer);
CompletionStage<Void> runAfterBoth(other, action);
CompletionStage<Void> runAfterBothAsync(other, action);
```
**OR汇聚关系**
```java
CompletionStage applyToEither(other, fn);
CompletionStage applyToEitherAsync(other, fn);
CompletionStage acceptEither(other, consumer);
CompletionStage acceptEitherAsync(other, consumer);
CompletionStage runAfterEither(other, action);
CompletionStage runAfterEitherAsync(other, action);
```

**Example**
```java
CompletableFuture<String> f1 = 
  CompletableFuture.supplyAsync(()->{
    int t = getRandom(5, 10);
    sleep(t, TimeUnit.SECONDS);
    return String.valueOf(t);
});

CompletableFuture<String> f2 = 
  CompletableFuture.supplyAsync(()->{
    int t = getRandom(5, 10);
    sleep(t, TimeUnit.SECONDS);
    return String.valueOf(t);
});

CompletableFuture<String> f3 = 
  f1.applyToEither(f2,s -> s);

System.out.println(f3.join());
```

**异常处理**
```java
CompletionStage exceptionally(fn);
CompletionStage<R> whenComplete(consumer);
CompletionStage<R> whenCompleteAsync(consumer);
CompletionStage<R> handle(fn);
CompletionStage<R> handleAsync(fn);
```

**Example**
```java
CompletableFuture<Integer> 
  f0 = CompletableFuture
    .supplyAsync(()->7/0))
    .thenApply(r->r*10)
    .exceptionally(e->0);
System.out.println(f0.join());
```

## CompletionService
批量执行异步任务

**Example**
```java
// 创建线程池
ExecutorService executor = 
  Executors.newFixedThreadPool(3);
// 创建CompletionService
CompletionService<Integer> cs = new 
  ExecutorCompletionService<>(executor);
// 异步向电商S1询价
cs.submit(()->getPriceByS1());
// 异步向电商S2询价
cs.submit(()->getPriceByS2());
// 异步向电商S3询价
cs.submit(()->getPriceByS3());
// 将询价结果异步保存到数据库
for (int i=0; i<3; i++) {
  //take阻塞获取feature  poll非阻塞获取 会返回null
  Integer r = cs.take().get();
  executor.execute(()->save(r));
}
```

## Fork/Join 
通过ForkJoinPool定义线程池，通过ForkJoinTask来执行任务。主要用来高效的进行并行分治递归。

ForkJoin的实现类 `RecursiveAction` 和 `RecursiveTask`

**Fibonacci Example**
```java

static void main(String[] args){
  //创建分治任务线程池  
  ForkJoinPool fjp = 
    new ForkJoinPool(4);
  //创建分治任务
  Fibonacci fib = 
    new Fibonacci(30);   
  //启动分治任务  
  Integer result = 
    fjp.invoke(fib);
  //输出结果  
  System.out.println(result);
}
//递归任务
static class Fibonacci extends 
    RecursiveTask<Integer>{
  final int n;
  Fibonacci(int n){this.n = n;}
  protected Integer compute(){
    if (n <= 1)
      return n;
    Fibonacci f1 = 
      new Fibonacci(n - 1);
    //创建子任务  
    f1.fork();
    Fibonacci f2 = 
      new Fibonacci(n - 2);
    //等待子任务结果，并合并结果  
    return f2.compute() + f1.join();
  }
}
```

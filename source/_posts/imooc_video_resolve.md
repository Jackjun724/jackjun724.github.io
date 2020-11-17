---
title: 慕课网视频直链解析
tags: 逆向分析
---

# 前言
之前学Flutter的时候买了慕课网的课程，因为在线看视频非常不方便，想下载下来，结果发现IMOOC并不支持这个功能，于是就去搜油猴和Gayhub，基本都被和谐了，无果，开始逆向分析。

# 开始
直接F12 -> Network，直接网络请求，发现了一个可疑链接：`https://www.imooc.com/course/playlist/1430?t=m3u8&_id=5848c001b3fee30a6c8b51bd&cdn=aliyun1`
，在页面HTML的代码中可以直接找到id的存在，那么我们只要收集到这些ID即可，那么在课程的目录页抓ID就可以了，网络的响应数据
```javascript
{
    "result":1,
    "data":{
        "info":"MkkqXqhmamoxAUB1PQ...",
        "cdn":["aliyun","aliyun1","letv"]
    },
    "msg":""
}
```
第一反应`info`应该是一个算法的密钥或者是加密数据，那我们就继续用F12的Network直接跟到代码里看请求发出的位置，去找到这个加密算法，打下断点，跟着断点往外走，可以发现一段访问了`data.info`数据的代码`destm_1.default(mediadata.data.info);`
这函数中就是所谓的加密算法，解密后我们会得到m3u8文件
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:PROGRAM-ID=1, BANDWIDTH=512000, RESOLUTION=1280x720
https://www.imooc.com/video/5848c001b3fee30a6c8b51bd/medium.m3u8?cdn=aliyun1...
#EXT-X-STREAM-INF:PROGRAM-ID=1, BANDWIDTH=384000, RESOLUTION=1280x720
https://www.imooc.com/video/5848c001b3fee30a6c8b51bd/medium.m3u8?cdn=aliyun1...
#EXT-X-STREAM-INF:PROGRAM-ID=1, BANDWIDTH=256000, RESOLUTION=720x480
https://www.imooc.com/video/5848c001b3fee30a6c8b51bd/low.m3u8?cdn=aliyun1...
```
打开这些地址后同样的又是相同的返回
```javascript
{
    "code":200,
    "data":{
        "info":"Gm1kQ7hmVBYXVGoxVGdUVGA9VBwcKnAyF1RmJD1UY1QHVGRrVBxu..."
    },
    "msg":"OK"
}
```
我们用同样的函数去解密，然后就会得到真实的M3U8文件列表。但是文件头写着AES加密，并给出了密钥。

具体解析实现参考我的[Github]，原文分析参考[这里](https://halo.cyblogs.top/archives/decrypt-imooc-video-download.html)

/* 解决click300ms延迟问题 */
FastClick.attach(document.body);
/* 获取元素 */
const musicBtn = document.querySelector(".music_btn"),
    wrapper = document.querySelector(".main_box .wrapper"),
    progress = document.querySelector(".progress"),
    curTime = progress.querySelector(".cur_time"),
    totalTime = progress.querySelector(".total_time"),
    progCur = progress.querySelector(".prog_cur"),
    myAudio = document.querySelector(".myAudio");
let lyricList = [],     //记录歌词集合   
    prevLyric = null,   //记录上一行显示的歌词
    num = 0,            //记录歌词切换次数
    PH = 0;             //一行歌词的高度
/* 获取数据&&绑定数据 */
const queryData = function queryData() {
    return new Promise(resolve => {
        let xhr = new XMLHttpRequest;
        xhr.open("get", "./json/lyric.json")
        xhr.onreadystatechange = () => {
            let { readyState, status, responseText } = xhr;
            if (readyState === 4 && status === 200) {
                let data = JSON.parse(responseText);
                //请求成功后,让实例状态为成功,值是获取的歌词(字符串)data.lyric
                resolve(data.lyric)
            }
        }
        xhr.send();
    })
}
const binding = function binding(lyric) {
    //歌词解析
    let data = [{
        minutes: '00',
        seconds: '01',
        text: '歌词'
    }];
    /* lyric = lyric.replace(/&#(32|40|41|45);/g, (val, $1) => {
        let table = {
            32: '',
            40: '(',
            41: ')',
            45: '-'
        }
        return table[$1] || val;
    }) */
    lyric.replace(/\[(\d+):(\d+).(?:\d+)\]([^\n]+)(?:\\n)?/g, (_, minutes, seconds, text) => {
        data.push({
            minutes,
            seconds,
            text
        });
    });
    //歌词绑定
    let str = ``;
    data.forEach(item => {
        let { minutes, seconds, text } = item;
        str += `<p minutes='${minutes}' seconds='${seconds}'>${text}</p>`
    })
    wrapper.innerHTML = str;
    lyricList = Array.from(wrapper.querySelectorAll("p"));
    PH = lyricList[0].offsetHeight
};


//当前是播放的，让其暂停 封装
const audioPause = function () {
    myAudio.pause()
    musicBtn.classList.remove('move')
    clearInterval(autoTimer);
    autoTimer = null;
}

//分和秒
const format = function format(time) {
    time = +time;
    let obj = {
        minutes: '00',
        seconds: '00'
    };
    if (time) {
        let m = Math.floor(time / 60),
            s = Math.round(time - m * 60);
        obj.minutes = m < 10 ? '0' + m : '' + m
        obj.seconds = s < 10 ? '0' + s : '' + s
    }
    return obj;
}


/* 歌词滚动 & 进度条处理*/
const handleLyric = function handleLyric() {
    let { duration, currentTime } = myAudio,
        a = format(currentTime),
        flag = false;

    //控制歌词选中
    for (let i = 0; i < lyricList.length; i++) {
        let item = lyricList[i]
        let minutes = item.getAttribute("minutes"),
            seconds = item.getAttribute("seconds");
        if (minutes === a.minutes && seconds === a.seconds) {
            //发现一个新匹配的,移除上一个的匹配，让下一个匹配
            if (prevLyric) prevLyric.className = '';
            item.className = 'active';
            prevLyric = item;
            num++;
            flag = true;
            break;
        }
    }
    //控制歌词移动
    if (num >= 4) {
        let top = parseFloat(window.getComputedStyle(wrapper).top);
        if (flag) top -= prevLyric.offsetHeight;
        wrapper.style.top = `${top}px`
    }

    //音乐播放结束
    if (currentTime >= duration) {
        wrapper.style.top = `0px`
        if (prevLyric) prevLyric.className = '';
        num = 0;
        prevLyric = null
        audioPause()
    }
}

const handleProgress = function handleProgress() {
    //duration总时间   currentTime现在的时间
    let { duration, currentTime } = myAudio,
        a = format(duration),
        b = format(currentTime);
    if (currentTime >= duration) {
        //播放结束
        curTime.innerHTML = `00:00`
        progCur.style.width = `0%`
        audioPause();
        return;
    }
    curTime.innerHTML = `${b.minutes}:${b.seconds}`;
    totalTime.innerHTML = `${a.minutes}:${a.seconds}`;
    progCur.style.width = `${currentTime / duration * 100}%`;
}
$sub.on('playing', handleLyric);
$sub.on('playing', handleProgress);

/* 控制播放和暂停 */
let autoTimer = null;
const handle = function handle() {
    musicBtn.style.opacity = 1;
    musicBtn.addEventListener('click', function () {
        //paused：监测是否暂停
        if (myAudio.paused) {
            //当前是暂停的:让其播放 && 开启定时器 监测进度条  play:播放
            myAudio.play();
            musicBtn.classList.add('move');
            if (autoTimer === null) {
                $sub.emit('playing')
                autoTimer = setInterval(() => {
                    $sub.emit('playing')
                }, 1000);
            }
            return;
        }
        //当前是播放的:我们让其暂停  pause：暂停
        audioPause();
    });
};
document.addEventListener('visibilitychange', function () {
    //离开页面
    if (document.hidden) {
        clearInterval(autoTimer);
        autoTimer = null;
        return
    }
    //进入页面
    if (autoTimer === null) {
        $sub.emit('playing')
        autoTimer = setInterval(() => {
            $sub.emit('playing')
        }, 1000);
    }
})

queryData()
    .then(value => {
        binding(value);
        handle();
    })


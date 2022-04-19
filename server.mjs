import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createFFmpeg } from '@ffmpeg/ffmpeg';

const ffmpegInstance = createFFmpeg({ log: true });
let ffmpegLoadingPromise = ffmpegInstance.load();


async function getFFmpeg() {
    if (ffmpegLoadingPromise) {
        await ffmpegLoadingPromise;
        ffmpegLoadingPromise = undefined;
    }

    return ffmpegInstance;
}

const app = express();
const port = 5000;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
})

app.use(cors());

app.post('/frames', upload.single('video'), async (req, res) => {
    const videoData = req.file.buffer;

    const { duration } = req.query;
    console.log(Math.floor(duration))
    const ffmpeg = await getFFmpeg();

    const inputFileName = `input-video`;
    const outputFileName = `out%d.png`;
    let outputData = [];
    
    let count= 0;
    
    if(Math.floor(duration) <= 10){
        count = Math.floor(duration)
    } else {
        count = 9
    }

    let framesPerSecond = 0;

    if (Math.floor(duration) <= 10 ) {
        framesPerSecond = 1
    } else if (Math.floor(duration) <= 15){
        framesPerSecond = 1
    } else if (Math.floor(duration) < 20){
        framesPerSecond = 1/1.5
    } else if (Math.floor(duration) < 30){
        framesPerSecond = 1/2
    } else if (Math.floor(duration) < 40){
        framesPerSecond = 1/2.5
    } else if (Math.floor(duration) < 45){
        framesPerSecond = 1/3
    } else if (Math.floor(duration) < 50){
        framesPerSecond = 1/3.5
    } else if (Math.floor(duration) < 55){
        framesPerSecond = 1/4
    } else if (Math.floor(duration) < 60){
        framesPerSecond = 1/4.5
    } else if (Math.floor(duration) < 65){
        framesPerSecond = 1/5
    }

    ffmpeg.FS('writeFile', inputFileName, videoData);

    await ffmpeg.run(
        '-i', inputFileName,
        '-vf', 'fps=' + framesPerSecond,
        outputFileName
    );

    for (let x = 1; x <= count; x++) {
        outputData.push(ffmpeg.FS('readFile', `out${x}.png`))
    };

    ffmpeg.FS('unlink', inputFileName);

    const blobfiles = [];
    
    outputData.forEach(item => {
        blobfiles.push(Buffer.from(item, 'binary'))
    });

    res.send(blobfiles);
});


app.post('/trim', upload.single('video'), async (req, res) => {
    try {
        const videoData = req.file.buffer;
        const { startTime, endTime } = req.query;

        const ffmpeg = await getFFmpeg();

        const inputFileName = `input-video`;
        const outputFileName = `output-image.mp4`;
        let outputData = null;

        ffmpeg.FS('writeFile', inputFileName, videoData);

        await ffmpeg.run(
            '-i', inputFileName,
            '-ss', startTime,
            '-to', endTime,
            '-c:v', 'copy',
            outputFileName
        );

        outputData = ffmpeg.FS('readFile', outputFileName);
        ffmpeg.FS('unlink', inputFileName);
        ffmpeg.FS('unlink', outputFileName);

        res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment;filename=${outputFileName}`,
            'Content-Length': outputData.length
        });
        res.end(Buffer.from(outputData, 'binary'));
    } catch(error) {
        console.error(error);
        res.sendStatus(500);
    }
});


app.listen(port, () => {
    console.log(`[info] ffmpeg-api listening at http://localhost:${port}`)
});

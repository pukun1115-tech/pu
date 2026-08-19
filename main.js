const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const keys = {};//キーの状態
document.addEventListener("keydown", e => keys[e.key] = true);//キーが押された時
document.addEventListener("keyup", e => keys[e.key] = false);//キーが押されてない時

//グローバル変数にする
let depthBuffer = null;
let colorBuffer = null;

//zBufferをclear
function clearBuffers() {
    const far = 1e9;//とても大きい
    for (let i = 0; i < depthBuffer.length; i++) {
        depthBuffer[i] = far;
        colorBuffer[i] = 0xff000000;//黒背景(ARGB)(0xは16進数ですよという意味)
    }
}

let chunks = [];
const chunkX = 16, chunkZ = 16, chunkY = 32;

//プレイヤーの目
const camera = {
    pos: { x: 0, y: 10, z: 0 },
    //y:90で右を向く
    //x:90で下を向く
    //z:90でカメラが反時計回り
    rot: { x: 45, y: 45, z: 0 },
    FOV: 90,
    near: 0.05,
    isZBuffer: false
};

for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
        chunks.push(new chunk(i, j));
    }
}

//キャンバスの大きさ変更
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

//度数法からラジアンに変換
function degToRad(d) {
    return d * Math.PI / 180;
}

function sortChunks() {
    chunks.sort((a, b) => {
        //カメラからの距離(**は2乗)(三平方の定理)(a or b distance)
        const ad = (
            Math.abs((a.x * chunkX + (chunkX) / 2) - camera.pos.x) +
            Math.abs((a.z * chunkZ + (chunkZ) / 2) - camera.pos.z)
        );

        const bd = (
            Math.abs((b.x * chunkX + (chunkX) / 2) - camera.pos.x) +
            Math.abs((b.z * chunkZ + (chunkZ) / 2) - camera.pos.z)
        );

        return bd - ad;//bd > adの時正の値を返す => bが前に来る
    });
}

//メインループ
function mainLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resize();

    for (const c of chunks) {
        c.generateTriangles();
    };

    if (camera.isZBuffer) {
        //Buffer初期化
        depthBuffer = new Float32Array(canvas.width * canvas.height);
        colorBuffer = new Uint32Array(canvas.width * canvas.height);
        clearBuffers();

        chunkDraw();

        present();
    }
    else {
        sortChunks();

        chunkDraw();
    }

    playerMove();

    requestAnimationFrame(mainLoop);
}

mainLoop();

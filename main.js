const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const keys = {};//キーの状態
document.addEventListener("keydown", e => keys[e.key] = true);//キーが押された時
document.addEventListener("keyup", e => keys[e.key] = false);//キーが押されてない時

const triangles = [{ verts: [{ x: 0, y: 0, z: 4 }, { x: 4, y: 0, z: 8 }, { x: 4, y: 0, z: 4 }], color: "#00ff00" }];
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
};

for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
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

        return bd - ad;//bd > adの時正の値を返す => bdが前に来る
    });
}

//メインループ
function mainLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resize();

    //いまはループの中にないと困る
    for (const c of chunks) {
        c.generateTriangles();
    };

    sortChunks();

    playerMove();
    chunkDraw();

    requestAnimationFrame(mainLoop);
}

mainLoop();
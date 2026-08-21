/*                                                                                                                                                  */
function chunkDraw() {
    //全チャンク
    for (const ch of chunks) {
        //チャンクの全三角形
        for (const tri of ch.triangles) {
            //カメラから見た座標にする
            const v1 = worldToCamera(tri.verts[0]);
            const v2 = worldToCamera(tri.verts[1]);
            const v3 = worldToCamera(tri.verts[2]);

            //if ((v2.x - v1.x) * (v3.y - v1.y) - (v2.y - v1.y) * (v3.x - v1.x) >= 0) continue;

            //近すぎる三角形をクリップする
            const cliped = clip3DTriangle(v1, v2, v3, tri.color);
            for (const t of cliped) {
                const a = projectPoint(t.verts[0]);
                const b = projectPoint(t.verts[1]);
                const c = projectPoint(t.verts[2]);
                if (a === null || b === null || c === null) continue;

                if (camera.isZBuffer) {
                    drawTriangleZBuffer(a, b, c, t.color);
                }
                else {
                    draw2DTriangle(a, b, c, t.color);
                }
            }
        }
    }
}

function abgrToRgbaString(color) {
    const r = ((color >> 0) & 0xFF);//0xは16進数
    const g = ((color >> 8) & 0xFF);
    const b = ((color >> 16) & 0xFF);
    const a = ((color >> 24) & 0xFF);

    return `rgba(${r},${g},${b},${a / 255})`;
}

//zBufferに描く
//p0, p1, p2はcanvas座標xとyと3Dのz座標を持つ
function drawTriangleZBuffer(p0, p1, p2, color) {
    //バウンディングボックス
    const minX = Math.floor(Math.min(p0.x, p1.x, p2.x));
    const maxX = Math.ceil(Math.max(p0.x, p1.x, p2.x));
    const minY = Math.floor(Math.min(p0.y, p1.y, p2.y));
    const maxY = Math.ceil(Math.max(p0.y, p1.y, p2.y));

    //全部のピクセルを調べる
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (y < 0 || y >= canvas.height || x < 0 || x >= canvas.width) continue;
            //三角形の中のみ
            if (!isInsideTriangle({ x: x, y: y }, p0, p1, p2)) continue;

            //z補完
            const z = interpolateZ({ x: x, y: y }, p0, p1, p2);

            //Bufferインデックス
            const idx = y * canvas.width + x;

            //Bufferに書き込むか
            if (z < depthBuffer[idx]) {
                depthBuffer[idx] = z;
                colorBuffer[idx] = color;
            }
        }
    }
}

//三角形の中か
//各辺に対する右左(正負)が全て等しければ内側ということ
//面積で考えると分かった
function isInsideTriangle(p, v0, v1, v2) {
    //p0 => p1
    const w0 = ((v1.x - v0.x) * (p.y - v0.y)) - ((v1.y - v0.y) * (p.x - v0.x));
    //p1 => p2
    const w1 = ((v2.x - v1.x) * (p.y - v1.y)) - ((v2.y - v1.y) * (p.x - v1.x));
    //p2 => p0
    const w2 = ((v0.x - v2.x) * (p.y - v2.y)) - ((v0.y - v2.y) * (p.x - v2.x));

    return (
        (w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)
    );
}

//z補完
function interpolateZ(p, v0, v1, v2) {
    const x0 = v0.x, y0 = v0.y;
    const x1 = v1.x, y1 = v1.y;
    const x2 = v2.x, y2 = v2.y;

    const px = p.x, py = p.y;

    //三角形の面積
    //v2が原点にあるとして
    // denom 分母
    const denom = (x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2);

    //w0は(p, v1, v2)の三角形の面積を(v0, v1, v2)の三角形の面積で割ったもの
    //割合
    const w0 = ((px - x2) * (y1 - y2) - (x1 - x2) * (py - y2)) / denom

    //w1 (v0, p, v2)
    const w1 = ((x0 - x2) * (py - y2) - (px - x2) * (y0 - y2)) / denom;

    //割合は合計で1になる
    const w2 = 1 - w0 - w1;

    return w0 * v0.z + w1 * v1.z + w2 * v2.z;
}



//データをキャンバスに描画
function present() {
    const w = canvas.width;
    const h = canvas.height;

    const img = ctx.createImageData(w, h);
    const data = new Uint32Array(img.data.buffer);

    for (let i = 0; i < colorBuffer.length; i++) {
        data[i] = colorBuffer[i];
    }

    ctx.putImageData(img, 0, 0);
}


//camera.nearでクリップした三角形0 or 1 or 2個を返す
//クリップ後の三角形は元の三角形と同じ反時計回りの頂点の順番
function clip3DTriangle(a, b, c, color) {
    //線分とcamera.nearの交点を返す
    function intersectNear(a, b) {
        const t = (a.z - camera.near) / (a.z - b.z);//tはaから交点までの割合
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: camera.near
        };
    }

    const aok = (a.z >= camera.near);
    const bok = (b.z >= camera.near);
    const cok = (c.z >= camera.near);

    const okCount = aok + bok + cok;

    //描画しない
    if (okCount === 0) return [];

    //クリップする必要なし
    if (okCount === 3) return [{ verts: [a, b, c], color: color }];

    //一つ返す
    if (aok + bok + cok === 1) {
        if (aok) {
            const rb = intersectNear(a, b);//rbはreturnするaとbの交点
            const rc = intersectNear(a, c);
            return [{ verts: [a, rb, rc], color: color }];
        }
        if (bok) {
            const ra = intersectNear(b, a);
            const rc = intersectNear(b, c);
            return [{ verts: [ra, b, rc], color: color }];
        }
        if (cok) {
            const ra = intersectNear(c, a);
            const rb = intersectNear(c, b);
            return [{ verts: [ra, rb, c], color: color }];
        }
    }

    //二つ返す
    if (aok + bok + cok === 2) {
        if (!aok) {
            const rb = intersectNear(b, a);
            const rc = intersectNear(c, a);
            return [{ verts: [rb, b, rc], color: color }, { verts: [rc, b, c], color: color }];
        }
        if (!bok) {
            const rc = intersectNear(c, b);
            const ra = intersectNear(a, b);
            return [{ verts: [rc, c, ra], color: color }, { verts: [ra, c, a], color: color }];
        }
        if (!cok) {
            const ra = intersectNear(a, c);
            const rb = intersectNear(b, c);
            return [{ verts: [ra, a, rb], color: color }, { verts: [rb, a, b], color: color }];
        }
    }
}

//canvasに三角形を描く関数
function draw2DTriangle(p1, p2, p3, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();
}

//ワールド座標をカメラの座標に変換したものを返す
function worldToCamera(v) {
    //ラジアン
    const rotX = degToRad(-camera.rot.x);
    const rotY = degToRad(-camera.rot.y);
    const rotZ = degToRad(-camera.rot.z);

    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

    //カメラが原点(カメラの座標を引く)
    const v1 = {
        x: v.x - camera.pos.x,
        y: v.y - camera.pos.y,
        z: v.z - camera.pos.z
    };

    //y軸回転
    const v2 = {
        x: v1.x * cosY + v1.z * sinY,
        y: v1.y,
        z: -v1.x * sinY + v1.z * cosY
    };

    //x軸回転
    const v3 = {
        x: v2.x,
        y: v2.y * cosX - v2.z * sinX,
        z: v2.y * sinX + v2.z * cosX
    };

    //z軸回転
    const v4 = {
        x: v3.x * cosZ - v3.y * sinZ,
        y: v3.x * sinZ + v3.y * cosZ,
        z: v3.z
    };

    //変換後
    return v4;
}

//投影座標返す(canvas座標)(点)
function projectPoint(v) {
    //ラジアンFOV
    const FOV = degToRad(camera.FOV)
    //カメラとスクリーンの距離を求める
    const f = 1 / Math.tan((FOV / 2));

    if (v.z < camera.near) return null;

    const x = (v.x * f) / v.z;
    const y = (v.y * f) / v.z;
    return { x: canvas.width / 2 + (Math.min(canvas.height, canvas.width) / 2) * x, y: canvas.height / 2 - (Math.min(canvas.height, canvas.width) / 2) * y, z: v.z };
}

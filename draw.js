/*                                                                                                                                                  */
function chunkDraw() {
    for (const c of chunks) {
        for (const tri of c.triangles) {
            const v1 = worldToCamera(tri.verts[0]);
            const v2 = worldToCamera(tri.verts[1]);
            const v3 = worldToCamera(tri.verts[2]);

            const cliped = clip3DTriangle(v1, v2, v3, tri.color);
            for (const t of cliped) {
                const a = projectPoint(t.verts[0]);
                const b = projectPoint(t.verts[1]);
                const c = projectPoint(t.verts[2]);
                if (a === null || b === null || c === null) return;
                draw2DTriangle(a, b, c, t.color);
            }
        }
    }
}

//camera.nearでクリップした三角形0 or 1 or 2個を返す
//クリップ後の三角形は元の三角形と同じ反時計回りの頂点の順番
function clip3DTriangle(a, b, c, color) {
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

//線分とcamera.nearの交点を返す
function intersectNear(a, b) {
    const t = (a.z - camera.near) / (a.z - b.z);//tはaから交点までの割合
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: camera.near
    };
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
    const f = 1 / Math.tan((FOV / 2));//0.05は調整用

    if (v.z < camera.near) return null;

    const x = (v.x * f) / v.z;
    const y = (v.y * f) / v.z;
    return { x: canvas.width / 2 + (canvas.height / 2) * x, y: canvas.height / 2 - (canvas.height / 2) * y };
}
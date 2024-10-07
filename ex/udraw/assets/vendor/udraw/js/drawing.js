export function drawLine(ctx, fromx, fromy, tox, toy, color, size) {
    ctx.beginPath(); //need to enclose in begin/close for colour settings to work
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'butt';
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    ctx.closePath();
}

export function drawSketchy(ctx, remoteClient, x, y, colorString) {
    let i, dx, dy, d;
    //push past points to client
    let points = remoteClient.points;

    //store the
    points.push([x + remoteClient.offsetX, y + remoteClient.offsetY]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = colorString;
    ctx.beginPath();
    ctx.moveTo(remoteClient.x, remoteClient.y); //prev
    ctx.lineTo(x, y); //latest
    ctx.stroke();
    let pointCount = remoteClient.pointCount;
    let threshold = 4000;
    //credit to mrdoob's 'harmony' drawing page.
    for (i = 0; i < points.length; i++) {
        dx = points[i][0] - points[pointCount][0];
        dy = points[i][1] - points[pointCount][1];
        d = dx * dx + dy * dy;

        if (d < threshold && Math.random() > (d / threshold)) {
            ctx.beginPath();
            ctx.moveTo(points[pointCount][0] + (dx * 0.3) - remoteClient.offsetX, points[pointCount][1] + (dy * 0.3) - remoteClient.offsetY);
            ctx.lineTo(points[i][0] - (dx * 0.3) - remoteClient.offsetX, points[i][1] - (dy * 0.3) - remoteClient.offsetY);
            ctx.stroke();
        }
    }
    remoteClient.pointCount++;
}

export function drawBrush(ctx, fromx, fromy, tox, toy, color, size) {
    ctx.beginPath(); //need to enclose in begin/close for colour settings to work
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    //shadow
    ctx.shadowBlur = size * 0; //disabled shadow
    ctx.shadowColor = "black";
    //
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    ctx.closePath();
    ctx.shadowBlur = 0; //set back to 0 othewise all drawings are shadowed?
}

export function eraseRegion(ctx, x, y, radius) {
    ctx.clearRect(x - radius, y - radius, radius, radius);
}

export function sprayCan(ctx, x, y, color, size) {
    // Particle count
    let count = size * 4;
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
        let randomAngle = Math.random() * (2 * Math.PI);
        let randomRadius = Math.random() * size;
        let ox = Math.cos(randomAngle) * randomRadius;
        let oy = Math.sin(randomAngle) * randomRadius;
        let xLocation = x + ox;
        let yLocation = y + oy;

        ctx.fillRect(xLocation, yLocation, 1, 1);
    }
}


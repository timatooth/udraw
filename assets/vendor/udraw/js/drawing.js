export const drawLine = (ctx, fromx, fromy, tox, toy, color, size) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'butt';
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    ctx.closePath();
};

export const drawSketchy = (ctx, remoteClient, x, y, colorString) => {
    const points = remoteClient.points;
    const threshold = 4000;

    points.push([x + remoteClient.offsetX, y + remoteClient.offsetY]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = colorString;
    ctx.beginPath();
    ctx.moveTo(remoteClient.x, remoteClient.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    const pointCount = remoteClient.pointCount;

    points.forEach((point, i) => {
        const dx = point[0] - points[pointCount][0];
        const dy = point[1] - points[pointCount][1];
        const d = dx * dx + dy * dy;

        if (d < threshold && Math.random() > (d / threshold)) {
            ctx.beginPath();
            ctx.moveTo(points[pointCount][0] + (dx * 0.3) - remoteClient.offsetX, points[pointCount][1] + (dy * 0.3) - remoteClient.offsetY);
            ctx.lineTo(point[0] - (dx * 0.3) - remoteClient.offsetX, point[1] - (dy * 0.3) - remoteClient.offsetY);
            ctx.stroke();
        }
    });

    remoteClient.pointCount++;
};

export const drawBrush = (ctx, fromx, fromy, tox, toy, color, size) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.shadowBlur = 0; // Disabled shadow
    ctx.shadowColor = "black";
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
    ctx.closePath();
    ctx.shadowBlur = 0;
};

export const eraseRegion = (ctx, x, y, radius) => {
    ctx.clearRect(x - radius, y - radius, radius * 2, radius * 2);
};

export const sprayCan = (ctx, x, y, color, size) => {
    const count = size * 4;
    ctx.fillStyle = color;

    for (let i = 0; i < count; i++) {
        const randomAngle = Math.random() * (2 * Math.PI);
        const randomRadius = Math.random() * size;
        const xLocation = x + Math.cos(randomAngle) * randomRadius;
        const yLocation = y + Math.sin(randomAngle) * randomRadius;

        ctx.fillRect(xLocation, yLocation, 1, 1);
    }
};
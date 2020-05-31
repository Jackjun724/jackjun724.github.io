class CanvasEntity {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.randomX = (Math.random() - 0.5) / 2;
    this.randomY = (Math.random() - 0.5) / 2;
  }

  draw(func) {
    ctx.beginPath();
    func();
    ctx.closePath();
  }

  next() {
    this.x = this.x + this.randomX > this.w ? this.x + (this.randomX = (0 - this.randomX)) :
      (this.x + this.randomX < 0 ? this.x + (this.randomX = (0 - this.randomX)) : this.x + this.randomX);
    this.y = this.y + this.randomY > this.h ? this.y + (this.randomY = (0 - this.randomY)) :
      (this.y + this.randomY < 0 ? this.y + (this.randomY = (0 - this.randomY)) : this.y + this.randomY);
  }
}

class Line {
  constructor(from, to, isDashed = false) {
    this.isDashed = Math.random() < 0.3;
    this.from = from;
    this.to = to;

  }

  draw() {
    let max = 30000;

    if (Math.pow(this.from.x - this.to.x, 2) + Math.pow(this.from.y - this.to.y, 2) < max) {
      ctx.beginPath();
      if (this.isDashed === true) {
        ctx.setLineDash([15, 2]);
      }
      let alpha = Line.getTanAngle(this.from.y - this.to.y, this.from.x - this.to.x);
      if (this.from.x - this.to.x < 0) {
        alpha = Math.PI + alpha;
      }

      let fX = this.from.x - (this.from.radius + 5) * Math.cos(alpha);
      let fY = this.from.y - (this.from.radius + 5) * Math.sin(alpha);
      let tX = this.to.x + (this.to.radius + 5) * Math.cos(alpha);
      let tY = this.to.y + (this.to.radius + 5) * Math.sin(alpha);
      ctx.moveTo(fX, fY);
      ctx.lineTo(tX, tY);

      let k = (1 - ((Math.pow(fX - tX, 2) + Math.pow(fY - tY, 2)) / max));
      ctx.lineWidth = 3 * k;
      ctx.strokeStyle = 'rgba(210,210,240,' + (0.8 * k) + ')';
      ctx.stroke();
      ctx.setLineDash([15, 0]);
      ctx.closePath();
    }
  }


  static getTanAngle(a, b) {
    return Math.atan(a / b)
  }
}


class ComboCircle extends CanvasEntity {
  constructor(x, y, w, h, radius, angle = 0, color1 = 'rgba(186, 202, 217, 1)', color2 = 'rgba(204, 215, 226, 1)') {
    super(x, y, w, h);
    this.radius = radius;
    this.angle = angle;
    this.color1 = color1;
    this.color2 = color2;
    this.speedRatio = Math.random();
  }

  draw() {
    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = this.color1;
      ctx.arc(this.x, this.y, this.radius, this.angle, Math.PI + this.angle, false);
      ctx.stroke();
      ctx.fill();
    });

    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = this.color2;
      ctx.arc(this.x, this.y, this.radius, Math.PI + this.angle, 2 * Math.PI + this.angle, false);
      ctx.stroke();
      ctx.fill();
    });
  }

  next() {
    super.next();
    this.spin();
    this.draw();
  }

  spin() {
    // 一帧转的角度 / 2 * 速率
    this.angle += Math.PI / 30 * this.speedRatio / 2;
  }
}

class MultipleCircle extends CanvasEntity {
  constructor(x, y, w, h, angle = 0) {
    super(x, y, w, h);
    this.angle = angle;
    this.speedRatio = Math.random();
    this.radius = 61 / 2
  }

  draw() {
    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = 'rgba(231, 237, 242, 1)';
      ctx.arc(this.x, this.y, this.radius, 0, 360, false);
      ctx.stroke();
      ctx.fill();
    });


    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = 'rgba(223, 230, 237, 1)';
      ctx.arc(this.x, this.y, 0.7 * this.radius, 0, 360, false);
      ctx.stroke();
      ctx.fill();
    });


    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = 'rgba(186, 202, 217, 1)';
      ctx.arc(this.x, this.y, 0.4 * this.radius, this.angle, Math.PI + this.angle, false);
      ctx.stroke();
      ctx.fill();
    });

    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = 'rgba(204, 215, 226, 1)';
      ctx.arc(this.x, this.y, 0.4 * this.radius, Math.PI + this.angle, this.angle, false);
      ctx.stroke();
      ctx.fill();
    });
  }

  next() {
    super.next();
    this.angle += Math.PI / 30 * this.speedRatio / 5;
    this.draw();
  }
}

class Background extends CanvasEntity {
  constructor(w, h, color = 'rgba(240, 243, 247, 1)') {
    super(0, 0, w, h);
    this.color = color
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  next() {
    super.next();
    this.draw();
  }
}

class Circle extends CanvasEntity {
  constructor(x, y, w, h, radius = 11, color = 'rgba(207, 218, 230, 1)') {
    super(x, y, w, h);
    this.radius = radius;
    this.color = color;
  }

  draw() {
    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = this.color;
      ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
      ctx.stroke();
      ctx.fill();
    })
  }

  next() {
    super.next();
    this.draw();
  }
}

class Ring extends CanvasEntity {
  constructor(x, y, w, h, radius = 11, color = 'rgba(207, 218, 230, 1)') {
    super(x, y, w, h);
    this.radius = radius;
    this.color = color;
    this.increment = 0;
  }

  draw() {
    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
      ctx.stroke();
    });

    this.drawInnerCircle(this.x + Math.cos(Math.PI * 2 + this.increment) * this.radius, this.y + Math.sin(Math.PI * 2 + this.increment) * this.radius, 'rgba(212, 222, 232, 1)');
    this.drawInnerCircle(this.x + Math.cos(Math.PI * 1.5 + this.increment) * this.radius, this.y + Math.sin(Math.PI * 1.5 + this.increment) * this.radius, 'rgba(246, 228, 184, 1)');
    this.drawInnerCircle(this.x + Math.cos(Math.PI + this.increment) * this.radius, this.y + Math.sin(Math.PI + this.increment) * this.radius, 'rgba(212, 222, 232, 1)');


    super.draw(() => {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.arc(this.x + Math.cos(Math.PI / 2 + this.increment) * this.radius, this.y + Math.sin(Math.PI / 2 + this.increment) * this.radius, 4, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(240, 243, 247, 1)';
      ctx.stroke();
      ctx.fill();
    });
  }

  drawInnerCircle(x, y, color) {
    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = color;
      ctx.arc(x, y, 4, 0, 2 * Math.PI, false);
      ctx.stroke();
      ctx.fill();
    })
  }

  next() {
    super.next();
    this.increment += 0.008;
    this.draw();
  }
}

class StarGroup extends CanvasEntity {
  constructor(x, y, w, h, radius = 20, color = 'rgba(207, 218, 230, 1)') {
    super(x, y, w, h);
    this.color = color;
    this.radius = radius;
    this.increment = 0;
    this.angle = Math.PI;
    this.speedRatio = Math.random()
  }

  draw() {
    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = 'rgba(230, 161, 166, 1)';
      ctx.arc(this.x, this.y, this.radius / 4, this.angle, Math.PI + this.angle, false);
      ctx.stroke();
      ctx.fill();
    });

    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = 'rgba(238, 226, 230, 1)';
      ctx.arc(this.x, this.y, this.radius / 4, Math.PI + this.angle, this.angle, false);
      ctx.stroke();
      ctx.fill();
    });

    super.draw(() => {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
      ctx.stroke();
    });

    this.drawInnerCircle(this.x + Math.cos(Math.PI * 2 + this.increment) * this.radius * 1.5, this.y + Math.sin(Math.PI * 2 + this.increment) * this.radius * 1.5);
    this.drawInnerCircle(this.x + Math.cos(Math.PI * 1.5 + this.increment) * this.radius * 1.5, this.y + Math.sin(Math.PI * 1.5 + this.increment) * this.radius * 1.5);
    this.drawInnerCircle(this.x + Math.cos(Math.PI + this.increment) * this.radius * 1.5, this.y + Math.sin(Math.PI + this.increment) * this.radius * 1.5);
  }

  drawInnerCircle(x, y) {
    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = 'rgba(207, 218, 230, 1)';
      ctx.arc(x, y, 4, 0, 2 * Math.PI, false);
      ctx.stroke();
      ctx.fill();
    })
  }

  next() {
    super.next();
    this.increment += 0.008;
    this.angle += Math.PI / 30 * this.speedRatio / 5;
    this.draw();
  }
}

class RingCircle extends CanvasEntity {
  constructor(x, y, w, h, radius = 5, color1 = 'rgba(186, 202, 217, 1)', color2 = 'rgba(204, 215, 226, 1)') {
    super(x, y, w, h);
    this.radius = radius;
    this.color1 = color1;
    this.color2 = color2;
    this.angle = 0;
    this.speedRatio = Math.random();
  }

  draw() {
    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = this.color1;
      ctx.arc(this.x, this.y, this.radius * 0.5, this.angle, Math.PI + this.angle, false);
      ctx.stroke();
      ctx.fill();
    });

    super.draw(() => {
      ctx.fillStyle = ctx.strokeStyle = this.color2;
      ctx.arc(this.x, this.y, this.radius * 0.5, Math.PI + this.angle, 2 * Math.PI + this.angle, false);
      ctx.stroke();
      ctx.fill();
    });

    super.draw(() => {
      ctx.strokeStyle = this.color1;
      ctx.lineWidth = 1;
      ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
      ctx.stroke();
    });
  }

  next() {
    super.next();
    this.angle += Math.PI / 30 * this.speedRatio / 5;
    this.draw();
  }
}

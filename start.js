let canvas, ctx;

(function initCanvas() {
  // init canvas element
  canvas = document.querySelector("#canvas");
  if (!canvas) throw new Error('Canvas element not found!');
  if (!canvas.getContext) throw new Error('Browser version is not support!');
  ctx = canvas.getContext('2d');

  let width = canvas.width, height = canvas.height;
  if (window.devicePixelRatio) {
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.height = height * window.devicePixelRatio;
    canvas.width = width * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  let entityList = [];

  // 初始化元素
  entityList.push(new Background(width, height));
  entityList.push(new MultipleCircle(width * 0.1, height * 0.1, width, height, Math.PI / 20));
  entityList.push(new Ring(width * 0.1, height * 0.5, width, height, 30));
  entityList.push(new StarGroup(width * 0.9, height * 0.15, width, height, 32));
  entityList.push(new RingCircle(700, 700, width, height, 30));
  for (let i = 0; i < 10; i++) {
    entityList.push(new Circle(Math.random() * width, Math.random() * height, width, height, Math.random() * 15 + 5, 'rgba(207, 218, 230, ' + Math.random() + 0.5 + ')'));
  }
  for (let i = 0; i < 4; i++) {
    entityList.push(new ComboCircle(Math.random() * width, Math.random() * height, width, height, 11.5));
  }

  let lineList = [];
  for (let i = 0; i < entityList.length; i++) {
    for (let j = i + 1; j < entityList.length; j++) {
      // 30%虚线率
      let line = new Line(entityList[i], entityList[j]);
      line.draw();
      lineList.push(line);
    }
  }

  // 执行变换逻辑
  setInterval(() => {
    entityList.forEach(item => {
      item.next();
    });
    lineList.forEach(item => {
      item.draw();
    });
  }, 16.67)
}());


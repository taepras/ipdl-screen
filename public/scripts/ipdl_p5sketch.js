var SIZE = 20;
var GUTTER = 20;
var PADDING_TL = 70;
var MODE = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(0);
    frameRate(60);
    strokeWeight(1);
    stroke(120);
}

function draw() {
    background(0);

    MODE = window.isLabOpen ? 0 : 2;

    var t = new Date() / 3000;

    for (var x = PADDING_TL; x < windowWidth; x += SIZE + GUTTER) {
        for (var y = PADDING_TL; y < windowHeight; y += SIZE + GUTTER) {
            var c = noise(x / SIZE / SIZE, y / SIZE / SIZE, t);

            if (MODE == 0) {
                colorMode(HSB);
                fill(Math.round(c * 300 + t * 50) % 360, 60, 100);
                noStroke();
                circle(x + SIZE / 2, y + SIZE / 2, SIZE);
                // filter( BLUR, 6 );
                circle(x + SIZE / 2, y + SIZE / 2, SIZE);
            }

            if (MODE == 1) {
                if (c < 0.55) {
                    stroke(255);
                    var sizeOffset = SIZE / Math.sqrt(2);
                    var crossPadding = (SIZE * (1 - 1 / Math.sqrt(2))) / 2;
                    line(
                        x + crossPadding,
                        y + crossPadding,
                        x + sizeOffset + crossPadding,
                        y + sizeOffset + crossPadding
                    );
                    line(
                        x + sizeOffset + crossPadding,
                        y + crossPadding,
                        x + crossPadding,
                        y + sizeOffset + crossPadding
                    );
                } else if (c < 0.6) {
                    // fill(0, 0, 255);
                    fill(117, 131, 255);
                    noStroke();
                    circle(x + SIZE / 2, y + SIZE / 2, SIZE);
                } else if (c < 0.65) {
                    // fill(255, 0, 0);
                    fill(255, 19, 116);
                    noStroke();
                    circle(x + SIZE / 2, y + SIZE / 2, SIZE);
                } else if (c < 0.7) {
                    // fill(0, 255, 0);
                    fill(1, 240, 120);
                    noStroke();
                    circle(x + SIZE / 2, y + SIZE / 2, SIZE);
                }
            }

            if (MODE == 2) {
                if (c < 0.55) {
                    stroke(120);
                    var sizeOffset = SIZE / Math.sqrt(2);
                    var crossPadding = (SIZE * (1 - 1 / Math.sqrt(2))) / 2;
                    line(
                        x + crossPadding,
                        y + crossPadding,
                        x + sizeOffset + crossPadding,
                        y + sizeOffset + crossPadding
                    );
                    line(
                        x + sizeOffset + crossPadding,
                        y + crossPadding,
                        x + crossPadding,
                        y + sizeOffset + crossPadding
                    );
                } else if (c < 0.65) {
                    noFill();
                    stroke(120);
                    circle(x + SIZE / 2, y + SIZE / 2, SIZE);
                } else {
                    fill(255);
                    noStroke();
                    circle(x + SIZE / 2, y + SIZE / 2, SIZE);
                }
            }
        }
    }
}

function windowResized () {
    resizeCanvas(windowWidth, windowHeight);
    background(0);
    frameRate(60);
    strokeWeight(1);
    stroke(120);
}
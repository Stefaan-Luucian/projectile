const canvas = document.querySelector("canvas");

const c = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

const scoreEl = document.querySelector("#scoreEl");
const modalEl = document.querySelector("#modalEl");
const modalScoreEl = document.querySelector("#modalScoreEl");
const buttonEl = document.querySelector("#buttonEl");
const startButtonEl = document.querySelector("#startButtonEl");
const startModalEl = document.querySelector("#startModalEl");
const volumeUpEl = document.querySelector("#volumeUpEl");
// const volumeOffEl = document.querySelector("#volumeOffEl");

let player;
let projectiles = [];
let enemies = [];
let particles = [];
let animationId;
let intervalId;
let score = 0;
let backgroundParticles = [];
let game = {
  active: false,
};
const shootAudio = new Howl({
  src: "./audio/Basic_shoot_noise.wav",
  volume: 0.02,
});
const damageTakenAudio = new Howl({
  src: "./audio/Damage_taken.wav",
  volume: 0.1,
});
const explodeAudio = new Howl({
  src: "./audio/Explode.wav",
  volume: 0.1,
});
const deathAudio = new Howl({
  src: "./audio/Death.wav",
  volume: 0.1,
});
const selectAudio = new Howl({
  src: "./audio/Select.wav",
  volume: 0.1,
});
const backAudio = new Howl({
  src: "./audio/Hyper.wav",
  volume: 0.02,
  loop: true,
});

function init() {
  const x = canvas.width / 2;
  const y = canvas.height / 2;
  player = new Player(x, y, 10, "	#ffe700");
  projectiles = [];
  enemies = [];
  particles = [];
  animationId;
  score = 0;
  scoreEl.innerHTML = 0;
  backgroundParticles = [];
  game = {
    active: true,
  };

  const spacing = 30;
  for (let x = 0; x < canvas.width + spacing; x += spacing) {
    for (let y = 0; y < canvas.height + spacing; y += spacing) {
      backgroundParticles.push(
        new BackgroundParticle({
          position: {
            x,
            y,
          },
          radius: 3,
        })
      );
    }
  }
}

function spawnEnemies() {
  intervalId = setInterval(() => {
    const radius = Math.random() * (30 - 4) + 4;
    let x;
    let y;
    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
      y = Math.random() * canvas.height;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }

    const color = `hsl(${Math.random() * 360}, 50%, 50%)`;

    const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);

    const velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
    enemies.push(new Enemy(x, y, radius, color, velocity));
  }, 2000);
}

function createScoreLabel({ position, score }) {
  const scoreLabel = document.createElement("label");
  scoreLabel.innerHTML = score;
  scoreLabel.style.color = "white";
  scoreLabel.style.position = "absolute";
  scoreLabel.style.left = position.x + "px";
  scoreLabel.style.top = position.y + "px";
  scoreLabel.style.userSelect = "none";
  scoreLabel.style.pointerEvents = "none";
  document.body.appendChild(scoreLabel);
  gsap.to(scoreLabel, {
    opacity: 0,
    y: -30,
    duration: 0.75,
    onComplete: () => {
      scoreLabel.parentNode.removeChild(scoreLabel);
    },
  });
}

function animate() {
  c.fillStyle = "rgba(0, 0 , 0 , 0.1)";
  animationId = requestAnimationFrame(animate);
  c.fillRect(0, 0, canvas.width, canvas.height);
  frames++;

  backgroundParticles.forEach((backgroundParticle) => {
    backgroundParticle.draw();

    const dist = Math.hypot(
      player.x - backgroundParticle.position.x,
      player.y - backgroundParticle.position.y
    );

    if (dist < 100) {
      backgroundParticle.alpha = 0;

      if (dist > 70) {
        backgroundParticle.alpha = 0.5;
      }
    } else if (dist > 100 && backgroundParticle.alpha < 0.1) {
      backgroundParticle.alpha += 0.1;
    } else if (dist > 100 && backgroundParticle.alpha > 0.1) {
      backgroundParticle.alpha -= 0.1;
    }
  });

  player.update();
  // powerUp.update();

  for (let index = particles.length - 1; index >= 0; index--) {
    const particle = particles[index];

    if (particle.alpha <= 0) {
      particles.splice(index, 1);
    } else {
      particle.update();
    }
  }
  projectiles.forEach((projectile, index) => {
    projectile.update();

    // remove from edges of screen
    if (
      projectile.x + projectile.radius < 0 ||
      projectile.x - projectile.radius > canvas.width ||
      projectiles.y + projectile.radius < 0 ||
      projectile.y - projectile.radius > canvas.height
    ) {
      setTimeout(() => {
        projectiles.splice(index, 1);
      }, 0);
    }
  });

  for (let index = enemies.length - 1; index >= 0; index--) {
    const enemy = enemies[index];

    enemy.update();

    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);

    //end game
    if (dist - enemy.radius - player.radius < 1) {
      cancelAnimationFrame(animationId);
      clearInterval(intervalId);
      deathAudio.play();
      game.active = false;

      modalEl.style.display = "block";
      gsap.fromTo(
        "#modalEl",
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          case: "expo",
        }
      );
      modalScoreEl.innerHTML = score;
    }

    for (
      let projectilesIndex = projectiles.length - 1;
      projectilesIndex >= 0;
      projectilesIndex--
    ) {
      const projectile = projectiles[projectilesIndex];

      const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

      // when projectiles touch enemy
      if (dist - enemy.radius - projectile.radius < 1) {
        //create explosions
        for (let i = 0; i < enemy.radius * 2; i++) {
          particles.push(
            new Particle(
              projectile.x,
              projectile.y,
              Math.random() * 2,
              enemy.color,
              {
                x: (Math.random() - 0.5) * (Math.random() * 6),
                y: (Math.random() - 0.5) * (Math.random() * 6),
              }
            )
          );
        }
        //shrink enemy
        if (enemy.radius - 10 > 5) {
          damageTakenAudio.play();
          score += 100;
          scoreEl.innerHTML = score;
          gsap.to(enemy, {
            radius: enemy.radius - 10,
          });
          createScoreLabel({
            position: {
              x: projectile.x,
              y: projectile.y,
            },
            score: 100,
          });
          projectiles.splice(projectilesIndex, 1);
        } else {
          //remove from scene altogether
          explodeAudio.play();
          score += 150;
          scoreEl.innerHTML = score;
          createScoreLabel({
            position: {
              x: projectile.x,
              y: projectile.y,
            },
            score: 150,
          });
          backgroundParticles.forEach((backgroundParticle) => {
            // backgroundParticle.color = enemy.color;
            gsap.set(backgroundParticle, {
              color: "white",
              alpha: 1,
            });
            gsap.to(backgroundParticle, {
              color: enemy.color,
              alpha: 0.1,
            });
          });
          enemies.splice(index, 1);
          projectiles.splice(projectilesIndex, 1);
        }
      }
    }
  }
}

let audioInitialized = false;

function shoot({ x, y }) {
  if (game.active) {
    const angle = Math.atan2(y - player.y, x - player.x);
    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5,
    };
    projectiles.push(new Projectile(player.x, player.y, 5, "yellow", velocity));
    shootAudio.play();
  }
}

window.addEventListener("click", (event) => {
  if (!backAudio.playing() && !audioInitialized) {
    backAudio.play();
    audioInitialized = true;
  }
  shoot({ x: event.clientX, y: event.clientY });
});

window.addEventListener("touchstart", (event) => {
  const x = event.touches[0].clientX;
  const y = event.touches[0].clientY;

  mouse.position.x = event.touches[0].clientX;
  mouse.position.y = event.touches[0].clientY;

  shoot({ x, y });
});
const mouse = {
  position: {
    x: 0,
    y: 0,
  },
};
addEventListener("mousemove", (event) => {
  mouse.position.x = event.clientX;
  mouse.position.y = event.clientY;
});

addEventListener("touchmove", (event) => {
  mouse.position.x = event.touches[0].clientX;
  mouse.position.y = event.touches[0].clientY;
});

//restart game
buttonEl.addEventListener("click", () => {
  selectAudio.play();
  init();
  animate();
  spawnEnemies();
  gsap.to("#modalEl", {
    opacity: 0,
    scale: 0.8,
    duration: 0.2,
    ease: "expo.in",
    onComplete: () => {
      modalEl.style.display = "none";
    },
  });
});

startButtonEl.addEventListener("click", () => {
  selectAudio.play();
  init();
  animate();
  spawnEnemies();
  //startModalEl.style.display = "none";
  gsap.to("#startModalEl", {
    opacity: 0,
    scale: 0.8,
    duration: 0.2,
    ease: "expo.in",
    onComplete: () => {
      startModalEl.style.display = "none";
    },
  });
});
// animate();
// spawnEnemies();

// volumeUpEl.addEventListener("click", () => {
//   backAudio.pause();
// });
// volumeOffEl.addEventListener("click", () => {
//   if (audioInitialized) backAudio.play();
// });
window.addEventListener("resize", () => {
  canvas.width = innerWidth;
  canvas.height = innerHeight;

  init();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInterval(intervalId);
  } else {
    spawnEnemies();
  }
});

window.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowRight":
      player.velocity.x += 1;
      break;
    case "ArrowUp":
      player.velocity.y -= 1;
      break;
    case "ArrowLeft":
      player.velocity.x -= 1;
      break;
    case "ArrowDown":
      player.velocity.y += 1;
      break;
  }
});

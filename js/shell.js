const NORMAL_SHELL = 250;
const MISSLE = 680;
const ULTRA_MISSLE = 550;
const TELE_SHELL = 450;

class HitParticle {
	constructor(x, y) {
		//particle body (IT IS A SQUARE)
		this.side = HIT_PARTICLE_SIDE;

		//particle info
		this.x = x;
		this.y = y;
		this.centerX = this.x + this.side / 2;
		this.centerY = this.y + this.side / 2;
		this.angle = (Math.floor(Math.random() * 360)) * Math.PI / 180;
		this.opacity = 1;
		this.speed = 400;
		this.explode = false;

		//RED, ORANGE, YELLOW
		this.possibleColors = ["#ED4245", "#FFA500", "#FFBF00"];
		this.color = this.possibleColors[Math.floor(Math.random() * this.possibleColors.length)];
	}

	update() {
		//GOAL: move particle in random angle while it slowly fades and slows

		//update position
		this.x += this.speed * Math.cos(this.angle) * deltaTime;
		this.y += this.speed * Math.sin(this.angle) * deltaTime;

		this.centerX = this.x + this.side / 2;
		this.centerY = this.y + this.side / 2;

		//update opacity and speed
		this.opacity -= 5 * deltaTime;
		this.speed -= 1 * deltaTime;

		//check for deletion
		if (this.opacity <= 0) {
			this.explode = true;
		}
	}

	render() {
		//RENDER PARTICLE
		ctx.shadowBlur = 5;
		ctx.shadowColor = this.color;
		ctx.save();

		ctx.translate(this.centerX, this.centerY);
		ctx.rotate(this.angle);

		//color in rgba to support opacity
		ctx.fillStyle = hexToRgbA(this.color, this.opacity);
		ctx.fillRect(this.side / -2, this.side / -2, this.side, this.side);

		ctx.restore();
		ctx.shadowBlur = 0;
	}
}

class TrailParticle {
	constructor(x, y) {
		//particle body (IT IS A CIRCLE)
		this.radius = TRAIL_PARTICLE_RADIUS;

		//particle info
		this.x = x;
		this.y = y;
		this.opacity = 1;
		this.expansionRate = 60;
		this.explode = false;

		//color in rgba to support opacity
		this.color = `#888888`;
	}

	update() {
		//GOAL: make particle expand until it fades

		//expand
		this.radius += this.expansionRate * deltaTime;

		//slow expansion rate down
		this.expansionRate -= 5 * deltaTime;

		//lower opacity
		this.opacity -= 4 * deltaTime;
	
		//check for deletion
		if (this.opacity <= 0) {
			this.explode = true;
		}
	}

	render() {
		//RENDER PARTICLE
		ctx.shadowBlur = 5;
		ctx.shadowColor = this.color;
		ctx.fillStyle = hexToRgbA(this.color, this.opacity);
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.shadowBlur = 0;
	}
}

class MissleParticle {
	constructor(x, y, missleType) {
		this.x = x;
		this.y = y;
		this.angle = (Math.floor(Math.random() * 360)) * Math.PI / 180;
		this.opacity = 1;
		this.speed = 100;
		this.explode = false;

		this.missleType = missleType;
		this.side = MISSLE_PARTICLE_SIDE;

		this.centerX = this.x + this.side / 2;
		this.centerY = this.y + this.side / 2;

		//RED, ORANGE, YELLOW
		this.possibleColors = ["#ED4245", "#FFA500", "#FFBF00"];
		this.color = this.possibleColors[Math.floor(Math.random() * this.possibleColors.length)];
	}

	update() {
		//GOAL: move particle in random angle while it slowly fades and slows

		//update position
		this.x += this.speed * Math.cos(this.angle) * deltaTime;
		this.y += this.speed * Math.sin(this.angle) * deltaTime;

		this.centerX = this.x + this.side / 2;
		this.centerY = this.y + this.side / 2;

		//update opacity and speed
		this.speed -= 1 * deltaTime;

		if (this.missleType == MISSLE) {
			this.opacity -= 5 * deltaTime;
		} else {
			this.opacity -= 20 * deltaTime;
		}

		//check for deletion
		if (this.opacity <= 0) {
			this.explode = true;
		}
	}

	render() {
		//RENDER PARTICLE
		ctx.shadowBlur = 5;
		ctx.shadowColor = this.color;
		ctx.save();

		ctx.translate(this.centerX, this.centerY);
		ctx.rotate(this.angle);

		//color in rgba to support opacity
		ctx.fillStyle = hexToRgbA(this.color, this.opacity);
		ctx.fillRect(this.side / -2, this.side / -2, this.side, this.side);

		ctx.restore();
		ctx.shadowBlur = 0;
	}
}

class Shell {
	constructor(x, y, shellType, angle, tankID) {
		//body
		this.width = SHELL_WIDTH;
		this.height = SHELL_HEIGHT;
		this.explode = false;

		//particles
		this.hitParticles = [];
		this.trailParticles = [];

		//particle delay
		this.trailParticleDelay = 0;

		//bullet info
		this.x = x;
		this.y = y;
		this.centerX = this.x + this.width / 2;
		this.centerY = this.y + this.height / 2;
		this.angle = angle;
		this.speed = shellType;
		this.tankID = tankID;
		this.id = Math.floor(Math.random() * 100000);
		this.ricochet = 547390;

		if (this.speed == MISSLE) {
			this.color = "#DE522F";
			this.trailParticleCap = 0.04;
		} else if (this.speed == ULTRA_MISSLE) {
			this.color = "#FFBF00";
			this.trailParticleCap = 0.02;
		} else if (this.speed == TELE_SHELL) {
			this.color = "#5865F2";
			this.trailParticleCap = 0.06;
		} else {
			this.color = "#D3D3D3";
			this.trailParticleCap = 0.09;
		}

		//keep track of what block this shell has last collided with to avoid double collisions
		this.collidedBlockID = null;

		//bullet will now fade away because of max collision
		this.diminish = false;

		//added peace mode for proper wall collision deaths
		this.peace = true;

		this.makeHitParticles();
	}

	makeHitParticles() {
		//MAKE 50 HIT PARTICLES
		for (var i = 0; i < 50; i++) {
			this.hitParticles.push(new HitParticle(this.centerX - HIT_PARTICLE_SIDE / 2, this.centerY - HIT_PARTICLE_SIDE / 2));
		}
	}

	//COLLISION CHECKS
	bounceX() {
		this.angle = Math.PI - this.angle;
		this.x += this.speed * Math.cos(this.angle) * deltaTime;
				
		this.makeHitParticles();
	}

	bounceY() {
		this.angle = 2 * Math.PI - this.angle;
		this.y += this.speed * Math.sin(this.angle) * deltaTime;

		this.makeHitParticles();
	}

	shellWithMine() {
		for (var i = 0; i < STAGE_CACHE.mines.length; i++) {
			const mine = STAGE_CACHE.mines[i];

			if (SAT_POLYGON_CIRCLE(this, {
				x: mine.x,
				y: mine.y,
				radius: mine.radius
			}) && !mine.exploding) {
				//explode this shell
				this.makeHitParticles();
				this.diminish = true;

				//explode mine
				mine.quickExplode();
			}
		}
	}

	shellWithTile() {
		for (var i = 0; i < STAGE_CACHE.tiles.length; i++) {
			const tile = STAGE_CACHE.tiles[i];

			//initial collision detection
			if (SAT_POLYGON(this, tile).collision) {
				const dx = (this.x + this.width / 2) - (tile.x + tile.width / 2);
				const dy = (this.y + this.height / 2) - (tile.y + tile.height / 2);
				const width = (this.width + tile.width) / 2;
				const height = (this.height + tile.height) / 2;
				const crossWidth = width * dy;
				const crossHeight = height * dx;

				//only check sides that are supposed to be hit based on shell direction
				const xDir = Math.sign(Math.cos(this.angle));
				const yDir = Math.sign(Math.sin(this.angle));

				if (crossWidth > crossHeight) {
					if (crossWidth > -crossHeight) {
						//bottom
						if (yDir == -1) {
							this.bounceY();
						}
					} else {
						//left
						if (xDir == 1) {
							this.bounceX();
						}
					}
				} else {
					if (crossWidth > -crossHeight) {
						//right
						if (xDir == -1) {
							this.bounceX();
						}
					} else {
						//top
						if (yDir == 1) {
							this.bounceY();
						}
					}
				}

				this.ricochet++;

				switch (this.speed) {
					case NORMAL_SHELL:
						if (this.ricochet >= 10) {
							playSound(shellOut);
						} else {
							playSound(shellDink);
						}
						break;
					case MISSLE:
						playSound(shellOut);
						break;
					case TELE_SHELL:
						if (this.ricochet >= 2) {
							playSound(shellOut);
						} else {
							playSound(shellDink);
						}
						break;
					case ULTRA_MISSLE:
						if (this.ricochet >= 3) {
							playSound(shellOut);
						} else {
							playSound(shellDink);
						}
						break;
				}

				this.peace = false;

				//once a shell hits a tile on one hit, wait till next tick before checking collision again or double collisions could happen
				break;
			}
		}
	}

	shellWithShell() {
		for (var i = 0; i < STAGE_CACHE.shells.length; i++) {
			const otherShell = STAGE_CACHE.shells[i];

			if (SAT_POLYGON(this, otherShell).collision && this.id !== otherShell.id && !otherShell.diminish) {
				//SHELL COLLIDED WITH OTHER SHELL

				//explode this shell
				this.makeHitParticles();
				otherShell.makeHitParticles();

				//explode other shell
				this.diminish = true;
				otherShell.diminish = true;

				playSound(shellOut);
			}
		}
	}

	shellWithPlayer() {
		const player = STAGE_CACHE.player;

		//if player isn't dead but it is intermission, player has won. don't let player die. also don't die if level is lobby. also don't die if the player completed the game
		if (!player.dead && !INTERMISSION && CURR_LEVEL !== 0 && !STAGE_CACHE.gameComplete) {
			const SATCollision = SAT_POLYGON(this, player.tank);

			//wait for bullet to leave contact of tank then remove peace mode
			if (this.peace) {
				if (!SATCollision.collision && this.tankID == PLAYER_ID) {
					this.peace = false;
				}
			}

			if (SATCollision.collision && !player.dead && !this.peace && !this.diminish) {
				//SHELL COLLIDED WITH PLAYER && PLAYER IS NOT DEAD && SHELL IS NOT IN PEACE MODE && IS NOT DIMINISHING

				//explode this shell
				this.diminish = true;

				//explode player tank ONLY IF it is not a tele shell
				if (this.speed == TELE_SHELL) {
					//find the tank responsible for this shell
					const enemy = getEnemy(this.tankID);

					const playerX = player.tank.x;
					const playerY = player.tank.y;

					//swap positions!
					player.tank.x = enemy.tank.x;
					player.tank.y = enemy.tank.y;

					enemy.tank.x = playerX;
					enemy.tank.y = playerY;

					player.tank.teleportExplosion();
					enemy.tank.teleportExplosion();

					playSound(hitByTele);
				} else {
					player.explode();
				}

				playSound(shellOut);
			}
		}
	}

	shellWithEnemy() {
		for (var i = 0; i < STAGE_CACHE.enemies.length; i++) {
			const enemy = STAGE_CACHE.enemies[i];
			const SATCollision = SAT_POLYGON(this, enemy.tank);

			//if this shell is in peace mode and it is no longer colliding with ITSELF, it is no longer peaceful
			if (this.peace) {
				if (!SATCollision.collision && this.tankID == enemy.tankID) {
					this.peace = false;
				}
			}

			if (SATCollision.collision && !enemy.dead && !this.peace && !this.diminish) {
				//SHELL COLLIDED WITH ENEMY && ENEMY IS NOT DEAD && SHELL IS NOT IN PEACE MODE && ISNT DIMINISHING

				//explode this shell
				this.diminish = true;

				//only allow death if the victim enemy tank is NOT in a violet protection bubble!
				if (!enemy.tank.inVioletShield) {
					//explode explode enemy tank ONLY IF it is not a tele shell
					if (this.speed == TELE_SHELL) {
						const thisEnemy = getEnemy(this.tankID);
						const otherEnemy = getEnemy(enemy.tankID);

						const thisEnemyX = thisEnemy.tank.x;
						const thisEnemyY = thisEnemy.tank.y;

						//swap positions!
						thisEnemy.tank.x = otherEnemy.tank.x;
						thisEnemy.tank.y = otherEnemy.tank.y;

						otherEnemy.tank.x = thisEnemyX;
						otherEnemy.tank.y = thisEnemyY;

						thisEnemy.tank.teleportExplosion();
						otherEnemy.tank.teleportExplosion();

						playSound(hitByTele);
					} else {
						enemy.explode();
					}

					playSound(shellOut);
				} else {
					this.makeHitParticles();
					playSound(shieldHit);
				}
			}
		}
	}

	update() {
		//UPDATE PARTICLES IF PLAYER IS NOT DEAD
		if (!STAGE_CACHE.player.dead) {
			//HIT PARTICLES
			for (var i = 0; i < this.hitParticles.length; i++) {
				const particle = this.hitParticles[i];

				//DELETE PARTICLE
				if (particle.explode) {
					this.hitParticles.splice(i, 1);
					continue;
				}

				particle.update();
			}

			//TRAIL PARTICLES
			for (var i = 0; i < this.trailParticles.length; i++) {
				const particle = this.trailParticles[i];

				//DELETE PARTICLE
				if (particle.explode) {
					this.trailParticles.splice(i, 1);
					continue;
				}

				particle.update();
			}

			//ADD TRAIL PARTICLE AFTER DELAY
			this.trailParticleDelay += deltaTime;

			if (this.trailParticleDelay > this.trailParticleCap) {
				this.trailParticleDelay = 0;
				this.trailParticles.push(new TrailParticle(this.centerX, this.centerY));

				if (this.speed == MISSLE || this.speed == ULTRA_MISSLE) {
					for (var i = 0; i < 5; i++) {
						this.trailParticles.push(new MissleParticle(this.x, this.y, this.speed));
					}
				}
			}

			//update coordinate of shell and collisions if not diminishing
			if (!this.diminish) {
				//UPDATE COORDINATES
				this.x += this.speed * Math.cos(this.angle) * deltaTime;
				this.y += this.speed * Math.sin(this.angle) * deltaTime;

				this.centerX = this.x + this.width / 2;
				this.centerY = this.y + this.height / 2;

				//COLLISIONS
				this.shellWithShell();
				this.shellWithMine();
				this.shellWithPlayer();
				this.shellWithEnemy();
				this.shellWithTile();

				//LEFT AND RIGHT WALL
				if (this.x - this.width / 2 <= 0 || this.x + this.width / 2 >= CANVAS_WIDTH) {
					this.bounceX();
					this.peace = false;
					this.ricochet++;
				}

				//TOP AND BOTTOM WALL
				if (this.y - this.height / 2 <= 0 || this.y + this.height / 2 >= CANVAS_HEIGHT) {
					this.bounceY();
					this.peace = false;
					this.ricochet++;
				}

				//MARK SHELL TO DELETE
				if (this.speed == NORMAL_SHELL && this.ricochet >= 2) {
					this.makeHitParticles();
					this.diminish = true;
				}

				if (this.speed == TELE_SHELL && this.ricochet >= 2) {
					this.makeHitParticles();
					this.diminish = true;
				}

				if (this.speed == MISSLE && this.ricochet >= 1) {
					this.makeHitParticles();
					this.diminish = true;
				}

				if (this.speed == ULTRA_MISSLE && this.ricochet >= 3) {
					this.makeHitParticles();
					this.diminish = true;			
				}
			}

			//if diminishing, let last of particles to render and fade before deleting
			if (this.diminish && this.hitParticles.length == 0) {
				//DELETE
				this.explode = true;
			}
		}
	}

	render() {
		if (!this.diminish) {
			//RENDER TRAIL PARTICLE
			for (var i = 0; i < this.trailParticles.length; i++) {
				this.trailParticles[i].render();
			}

			//RENDER SHELL
			ctx.shadowBlur = 3;

			if (this.speed == MISSLE || this.speed == ULTRA_MISSLE || this.speed == TELE_SHELL) {
				ctx.shadowColor = this.color;
			} else {
				ctx.shadowColor = "black";
			}

			ctx.save();

			ctx.translate(this.centerX, this.centerY);
			ctx.rotate(this.angle);

			ctx.fillStyle = this.color;
			ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);

			ctx.restore();

			ctx.shadowBlur = 0;
		}

		//RENDER HIT PARTICLE
		for (var i = 0; i < this.hitParticles.length; i++) {
			this.hitParticles[i].render();
		}
	}

	renderShadow() {
		if (!this.diminish) {
			ctx.save();

			ctx.translate(this.centerX - 5, this.centerY + 5);
			ctx.rotate(this.angle);

			ctx.fillStyle = SHADOW;
			ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);

			ctx.restore();
		}
	}
}

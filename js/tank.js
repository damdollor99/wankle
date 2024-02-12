class TankParticle {
	constructor(x, y, tankColor, isRGB) {
		//particle body (IT IS A SQUARE)
		this.side = TANK_PARTICLE_SIDE;

		//particle info
		this.x = x;
		this.y = y;
		this.centerX = this.x + this.side / 2;
		this.centerY = this.y + this.side / 2;
		this.angle = (Math.floor(Math.random() * 360)) * Math.PI / 180;
		this.opacity = 1;
		this.speed = 600;
		this.explode = false;

		if (!isRGB) {
			//RED, ORANGE, GREY, TANK COLOR
			this.possibleColors = ["#ED4245", "#FFA500", "#808080", tankColor];
		} else {
			//RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE
			this.possibleColors = ["#ED4245", "#FFA500", "#DEC951", "#3AB02E", "#224ACF", "#934A9E"];
		}
		
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
		this.opacity -= 3 * deltaTime;
		this.speed -= 2 * deltaTime;

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

//TELEPORTATION PARTICLE
class TeleportationParticle {
	constructor(x, y) {
		//particle body (IT IS A CIRCLE)
		
		//body
		this.x = x;
		this.y = y;

		//particle info
		this.radius = TELEPORTATION_PARTICLE_RADIUS;
		this.angle = (Math.floor(Math.random() * 360)) * Math.PI / 180;
		this.color = "#5081F2";
		this.opacity = 1;
		this.speed = 8000;
		this.explode = false;
	}

	update() {
		//GOAL: Make particles of different size spew out in random directions, slowing to a halt and laying there

		this.speed /= 120 * deltaTime;
		this.opacity -= deltaTime;

		//update position
		this.x += this.speed * Math.cos(this.angle) * deltaTime;
		this.y += this.speed * Math.sin(this.angle) * deltaTime;

		if (this.opacity <= 0) {
			this.explode = true;
		}
	}

	render() {
		ctx.shadowBlur = 10;
		ctx.shadowColor = hexToRgbA(this.color, this.opacity);
		ctx.fillStyle = hexToRgbA(this.color, this.opacity);
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.shadowBlur = 0;
	}
}

//TANK TRACKS
class Track {
	constructor(x, y, angle) {
		//body
		this.width = TRACK_WIDTH;
		this.height = TRACK_HEIGHT;
		this.opacity = 0.5;
		this.color = "#7B3F00";

		//track info
		this.x = x;
		this.y = y;
		this.centerX = this.x + this.width / 2;
		this.centerY = this.y + this.height / 2;
		this.angle = angle;
		this.explode = false;
	}

	update() {
		//update opacity, mark for deletion
		this.opacity -= 0.03 * deltaTime;

		if (this.opacity <= 0) {
			this.explode = true;
		}
	}

	render() {
		ctx.shadowBlur = 3;
		ctx.shadowColor = hexToRgbA(this.color, this.opacity);
		ctx.save();

		ctx.translate(this.centerX, this.centerY);
		ctx.rotate(this.angle);

		ctx.fillStyle = hexToRgbA(this.color, this.opacity);

		//LEFT WHEEL TRACK
		ctx.fillRect(this.width / -2, (this.height / -2) - this.height / 2, this.width, this.height);
		//RIGHT WHEEL TRACK
		ctx.fillRect(this.width / -2, (this.height / 2) + this.height / 1.5, this.width, this.height);

		ctx.restore();
		ctx.shadowBlur = 0;
	}
}

//GRAVE MARKER
class Grave {
	constructor(x, y, color) {
		//body
		this.width = GRAVE_WIDTH;
		this.height = GRAVE_HEIGHT;

		//grave info
		this.x = x;
		this.y = y;
		this.centerX = this.x + this.width / 2;
		this.centerY = this.y + this.height / 2;
		this.color = color;
	}

	render() {
		ctx.shadowBlur = 5;
		ctx.shadowColor = this.color;
		ctx.fillStyle = this.color;

		//right tilted mark
		ctx.save();

		ctx.translate(this.centerX, this.centerY);
		ctx.rotate(-45 * Math.PI / 180);

		ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);

		ctx.restore();

		//left tilted mark
		ctx.save();

		ctx.translate(this.centerX, this.centerY);
		ctx.rotate(45 * Math.PI / 180);

		ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);

		ctx.restore();
		ctx.shadowBlur = 0;
	}
}

//TANK CONSTRUCTOR
class Tank {
	constructor(x, y, angle, turretAngle, color, turretColor, sideColor, speed, rotationSpeed, tankID, tankType) {
		//ID
		this.tankID = tankID;

		//tankType
		this.tankType = tankType;

		//body
		this.width = TANK_WIDTH;
		this.height = TANK_HEIGHT;
		this.turretBaseSide = 19;
		this.turretNozzleWidth = 21;
		this.turretNozzleHeight = 10;

		//particles done this way to delay particle a bit
		this.tankExplosion = false;
		this.explosionRingCount = 0;
		this.explosionParticleDelay = 0;
		this.explosionParticles = [];

		this.teleportParticles = [];

		//tank info
		this.x = x
		this.y = y;
		this.centerX = this.x + this.width / 2;
		this.centerY = this.y + this.height / 2;
		this.speed = speed;
		this.rotationSpeed = rotationSpeed;
		this.angle = angle;
		this.turretAngle = turretAngle;
		this.color = color;
		this.turretColor = turretColor;
		this.sideColor = sideColor;
		this.inVioletShield = false;
	}

	isInVioletShield() {
		for (var i = 0; i < STAGE_CACHE.violetProtection.length; i++) {
			if (SAT_POLYGON_CIRCLE(this, STAGE_CACHE.violetProtection[i])) {
				this.inVioletShield = true;

				//return because you don't need to check more violet shields (it's already in one!)
				return;
			} else {
				this.inVioletShield = false;
			}
		}

		//this will be hard set if there are no shields to check (no violet tanks active in level)
		this.inVioletShield = false;
	}

	teleportExplosion() {
		//update centerX and centerY
		this.centerX = this.x + this.width / 2;
		this.centerY = this.y + this.height / 2;

		if (!this.dead) {
			//only create 30 teleportation particles if the tank isn't dead
			for (var i = 0; i < 30; i++) {
				this.teleportParticles.push(new TeleportationParticle(this.centerX, this.centerY));
			}
		}
	}

	//tank death
	explodeTank() {
		playSound(tankDeath);

		if (this.tankID == PLAYER_ID) {
			//player death sound
			playSound(playerDeath);
		} else {
			//enemy death sound
			playSound(enemyDeath);
		}

		this.tankExplosion = true;
	}

	//shooting
	shoot(targetCoords, shellType, tankID) {
		const angle = Math.atan2(targetCoords.y - this.centerY, targetCoords.x - this.centerX);
		const initialBoost = 20;
		
		//play shell sound
		switch(shellType) {
			case NORMAL_SHELL:
				playSound(normalShoot);
				break;
			case MISSLE:
				playSound(missleShoot);
				break;
			case ULTRA_MISSLE:
				playSound(ultraMissleShoot);
				break;
			case TELE_SHELL:
				playSound(teleShot);
				break;
		}

		//shoot
		STAGE_CACHE.shells.push(new Shell(this.centerX - SHELL_WIDTH / 2 + (initialBoost * Math.cos(angle)), this.centerY - SHELL_HEIGHT / 2 + (initialBoost * Math.sin(angle)), shellType, angle, tankID));
	}

	//lay mine
	layMine(tankID) {
		playSound(minePlace);
		STAGE_CACHE.mines.push(new Mine(this.centerX, this.centerY, tankID));
	}

	//update track marks
	trackUpdate() {
		//only moving tanks get updated

		if (this.tankID == PLAYER_ID) {
			//player tank

			if (STAGE_CACHE.player.moving && !INTERMISSION) {
				playSound(tankMovement);
			}
		} else {
			//moving enemy tanks (don't play if player is dead)
			if (!STAGE_CACHE.player.dead) {
				playSound(tankMovement);
			}
		}

		STAGE_CACHE.tracks.push(new Track(this.centerX - TRACK_WIDTH / 2, this.centerY - TRACK_HEIGHT / 2, this.angle));
	}

	//COLLISIONS
	tankWithTank() {
		for (var i = 0; i < STAGE_CACHE.enemies.length; i++) {
			const enemy = STAGE_CACHE.enemies[i];

			//if this enemy im looping through is NOT me
			if (enemy.tankID !== this.tankID && !enemy.dead) {
				const SATCollision = SAT_POLYGON(this, enemy.tank);
				if (SATCollision.collision) {
					//push myself
					this.x += SATCollision.normal.x * SATCollision.depth / 2;
					this.y += SATCollision.normal.y * SATCollision.depth / 2;

					//push enemy
					enemy.tank.x -= SATCollision.normal.x * SATCollision.depth / 2;
					enemy.tank.y -= SATCollision.normal.y * SATCollision.depth / 2;
				}
			}
		}

		//if i am not a player, check collisions for player
		if (this.tankID !== PLAYER_ID) {
			const player = STAGE_CACHE.player;
			const SATCollision = SAT_POLYGON(this, player.tank);

			if (SATCollision.collision) {
				this.x += SATCollision.normal.x * SATCollision.depth / 2;
				this.y += SATCollision.normal.y * SATCollision.depth / 2;

				//push player
				player.tank.x -= SATCollision.normal.x * SATCollision.depth / 2;
				player.tank.y -= SATCollision.normal.y * SATCollision.depth / 2;
			}
		}
	}

	tankWithTile() {
		for (var i = 0; i < STAGE_CACHE.tiles.length; i++) {
			const tile = STAGE_CACHE.tiles[i];
			const SATCollision = SAT_POLYGON(this, tile);

			if (SATCollision.collision) {
				this.x += SATCollision.normal.x * SATCollision.depth / 2;
				this.y += SATCollision.normal.y * SATCollision.depth / 2;
			}
		}
	}

	tankWithPit() {
		for (var i = 0; i < STAGE_CACHE.pits.length; i++) {
			const pit = STAGE_CACHE.pits[i];
			const SATCollision = SAT_POLYGON(this, pit);

			if (SATCollision.collision) {
				this.x += SATCollision.normal.x * SATCollision.depth / 2;
				this.y += SATCollision.normal.y * SATCollision.depth / 2;
			}
		}
	}

	tankWithBorder() {
		for (var i = 0; i < borders.length; i++) {
			const border = borders[i];
			const SATCollision = SAT_POLYGON(this, border);

			if (SATCollision.collision) {
				this.x += SATCollision.normal.x * SATCollision.depth / 2;
				this.y += SATCollision.normal.y * SATCollision.depth / 2;
			}
		}
	}

	updateBody(targetCoords) {
		//update center
		if (!this.dead) {
			this.centerX = this.x + this.width / 2;
			this.centerY = this.y + this.height / 2;

			//update collisions
			this.tankWithBorder();
			this.tankWithTank();
			this.tankWithTile();
			this.tankWithPit();

			//update shield collision for tanks other than violet and player
			if (this.tankType !== VIOLET_TANK && this.id !== PLAYER_ID) {
				this.isInVioletShield();
			}
		}
	}

	updateParticles() {
		//update tank explosion particles
		if (this.tankExplosion) {

			//increase delay
			this.explosionParticleDelay += deltaTime;

			if (this.explosionParticleDelay > 0) {
				//push new ring of 50 particles
				for (var i = 0; i < 50; i++) {
					if (this.tankID == PLAYER_ID && SETTING_RGB) {
						//rgb
						this.explosionParticles.push(new TankParticle(this.centerX - TANK_PARTICLE_SIDE / 2, this.centerY - TANK_PARTICLE_SIDE / 2, this.color, true));	
					} else {
						//non rgb
						this.explosionParticles.push(new TankParticle(this.centerX - TANK_PARTICLE_SIDE / 2, this.centerY - TANK_PARTICLE_SIDE / 2, this.color, false));	
					}
				}
				this.explosionRingCount++;
				this.explosionParticleDelay = 0;

			}

			if (this.explosionRingCount == 8) {
				//stop explosion/reset
				this.tankExplosion = false;
				this.explosionRingCount = 0;
				this.explosionParticleDelay = 0;
			}
		}

		for (var i = 0; i < this.teleportParticles.length; i++) {
			const particle = this.teleportParticles[i];

			//DELETE PARTICLE
			if (particle.explode) {
				this.teleportParticles.splice(i, 1);
				continue;
			}

			particle.update();
		}
		
		for (var i = 0; i < this.explosionParticles.length; i++) {
			const particle = this.explosionParticles[i];

			//DELETE PARTICLE
			if (particle.explode) {
				this.explosionParticles.splice(i, 1);
				continue;
			}

			particle.update();
		}
	}

	renderRGB(isDead) {
		//RENDER RGB WOOOO
		if (!isDead) {
			const rgbColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

			ctx.shadowBlur = 3;
			ctx.lineWidth = 2;
			ctx.shadowColor = rgbColor;

			//draw tank
			ctx.save();

			ctx.translate(this.centerX, this.centerY);
			ctx.rotate(this.angle);

			//DRAW TANK BASE//		
			ctx.strokeStyle = rgbColor;
			ctx.strokeRect(this.width / -2, this.height / -2, this.width, this.height);

			//DRAW TANK SIDES//
			
			//WHEELS
			ctx.strokeStyle = rgbColor;

			//left wheel
			ctx.strokeRect(this.width / -2, this.height / -2, this.width, this.height / 5);

			//right wheel
			ctx.strokeRect(this.width / -2, this.height / 3, this.width, this.height / 5);

			ctx.restore();

			ctx.save();

			//DRAW TURRET//
			ctx.translate(this.centerX, this.centerY);
			ctx.rotate(this.turretAngle);

			ctx.strokeStyle = rgbColor;

			ctx.shadowBlur = 20;
			ctx.shadowColor = rgbColor;

			//turret base
			ctx.strokeStyle = rgbColor;
			ctx.strokeRect(this.turretBaseSide / -2, this.turretBaseSide / -2, this.turretBaseSide, this.turretBaseSide);

			//turret nozzle
			ctx.strokeStyle = rgbColor;
			ctx.strokeRect(this.turretNozzleWidth / 2, this.turretNozzleHeight / -2, this.turretNozzleWidth, this.turretNozzleHeight);

			ctx.restore();
			ctx.shadowBlur = 0;
		}

		//RENDER TANK EXPLOSION PARTICLES
		for (var i = 0; i < this.explosionParticles.length; i++) {
			this.explosionParticles[i].render();
		}
	}

	render(isDead) {
		//RENDER THIS IF TANK IS STILL ALIVE//
		if (!isDead) {
			ctx.shadowBlur = 3;
			ctx.shadowColor = this.color;

			//draw tank
			ctx.save();

			ctx.translate(this.centerX, this.centerY);
			ctx.rotate(this.angle);

			//render violet tank shield for enemy tanks that are within a shield
			if (this.tankID !== PLAYER_ID && this.tankType !== VIOLET_TANK && this.inVioletShield) {
				ctx.shadowBlur = 50;
				ctx.shadowColor = "#FF19F8";
				ctx.strokeStyle = "#FF19F8";
				ctx.lineWidth = 2;
				ctx.strokeRect(this.width / -2, this.height / -2, this.width, this.height);

				ctx.fillStyle = hexToRgbA("#FF19F8", 0.4);
				ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);
			}

			//DRAW TANK BASE//		
			ctx.fillStyle = this.color;
			ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);

			//DRAW TANK SIDES//
			
			//WHEELS
			ctx.fillStyle = this.sideColor;

			//left wheel
			ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height / 5);

			//right wheel
			ctx.fillRect(this.width / -2, this.height / 3, this.width, this.height / 5);

			ctx.restore();

			ctx.save();

			//DRAW TURRET//
			ctx.translate(this.centerX, this.centerY);
			ctx.rotate(this.turretAngle);
			ctx.lineWidth = 3;
			ctx.strokeStyle = "black";

			ctx.shadowBlur = 20;
			ctx.shadowColor = this.color;

			//turret base
			ctx.fillStyle = this.turretColor;
			ctx.strokeRect(this.turretBaseSide / -2, this.turretBaseSide / -2, this.turretBaseSide, this.turretBaseSide);
			ctx.fillRect(this.turretBaseSide / -2, this.turretBaseSide / -2, this.turretBaseSide, this.turretBaseSide);

			//turret nozzle
			ctx.fillStyle = this.turretColor;
			ctx.strokeRect(this.turretNozzleWidth / 2, this.turretNozzleHeight / -2, this.turretNozzleWidth, this.turretNozzleHeight);
			ctx.fillRect(this.turretNozzleWidth / 2, this.turretNozzleHeight / -2, this.turretNozzleWidth, this.turretNozzleHeight);

			ctx.restore();
			ctx.shadowBlur = 0;
		}

		//RENDER THIS IF TANK IS STILL ALIVE OR DEAD//

		//RENDER TANK TELEPORTATION PARTICLES//
		for (var i = 0; i < this.teleportParticles.length; i++) {
			this.teleportParticles[i].render();
		}

		//RENDER TANK EXPLOSION PARTICLES
		for (var i = 0; i < this.explosionParticles.length; i++) {
			this.explosionParticles[i].render();
		}
	}

	renderShadow(isDead) {
		if (!isDead) {
			ctx.save();

			ctx.translate(this.centerX - 5, this.centerY + 5);
			ctx.rotate(this.angle);

			ctx.fillStyle = SHADOW;
			ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);

			ctx.restore();
		}
	}
}

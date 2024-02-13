class BrownTank {
	constructor(x, y, angle, turretAngle) {
		//ID
		this.tankID = Math.floor(Math.random() * 100000);

		this.tankType = BROWN_TANK;
		this.tank = new Tank(x, y, angle, turretAngle, "#966A4B", "#8C6346", "#B0896B", 0, 0, this.tankID, this.tankType);
		this.bounces = 5;
		this.dead = false;

		//turret update
		//(90 * deltaTime) == 1.5 deg
		this.try = 0;
		this.noise = false;
		this.noiseDelay = 0;
		this.noiseAmount = 0.5;
		this.turretRotation = 90 * deltaTime * Math.PI / 180;
		this.shellDelay = 0.1;
	}

	//cast a ray to player
	castToPlayer(ray, angle, bouncesLeft, firstShot, collidedSideID) {
		//check for comrade collisions overall. If a ray has a comrade collision it should not be taken
		const comradeCollision = getComradeCollisions(ray, angle, firstShot, this.tankID);

		if (!comradeCollision.reflection) {
			if (bouncesLeft > 0) {
				const wallCollision = getWallCollisions(ray, angle, collidedSideID);

				if (wallCollision.reflection) {
					return this.castToPlayer(wallCollision.reflection.newRay, wallCollision.reflection.newAngle, bouncesLeft - 1, false, wallCollision.id);
				} else {
					const borderCollision = getBorderCollisions(ray, angle, collidedSideID);

					//terminate
					if (!borderCollision) return {
						detectPlayer: false,
						noWalls: false
					};

					return this.castToPlayer(borderCollision.reflection.newRay, borderCollision.reflection.newAngle, bouncesLeft - 1, false, borderCollision.id);
				}
			} else {
				//must hit player on last round
				const playerCollision = getPlayerCollisions(ray, angle, false);

				if (playerCollision.reflection) {
					//check if any walls are in the way
					const wallCollision = getWallCollisions(new Ray(ray.pointA, playerCollision.reflection.point), angle, collidedSideID);

					if (!wallCollision.reflection) {
						//no walls are in the way!
						return {
							detectPlayer: true,
							noWalls: true
						};
					} else {
						//some walls are in the way :(
						return {
							detectPlayer: true,
							noWalls: false
						};
					}
				} else {
					//doesn't hit player :(
					return {
						detectPlayer: false,
						noWalls: false
					};
				}
			}
		} else {
			return {
				detectPlayer: false,
				noWalls: false
			};
		}
	}

	//fires two rays on each corner of a shell to determine if shell should be fired
	shouldFire(ray) {
		const perpAngle = getPerpAngle(this.tank.angle);
		const Cos = Math.cos(perpAngle) * SHELL_HEIGHT * STATIONARY_RAY_OFFSET;
		const Sin = Math.sin(perpAngle) * SHELL_HEIGHT * STATIONARY_RAY_OFFSET;
		
		//left ray
		const leftRay = new Ray(new xy(ray.pointA.x + Cos, ray.pointA.y + Sin), new xy(ray.pointB.x + Cos, ray.pointB.y + Sin));
		
		//right ray
		const rightRay = new Ray(new xy(ray.pointA.x - Cos, ray.pointA.y - Sin), new xy(ray.pointB.x - Cos, ray.pointB.y - Sin));

		//leftCast
		const leftCast = this.castToPlayer(leftRay, this.tank.turretAngle, this.bounces, true, null);

		//rightCast
		const rightCast = this.castToPlayer(rightRay, this.tank.turretAngle, this.bounces, true, null);

		//if either ray collide with player, lock on. If there are no walls, shoot!

		if (leftCast.detectPlayer || rightCast.detectPlayer) {
			if (this.try < 2) {
				this.try++;
				this.noise = true;
			} else {
				this.try = 0;
				this.turretRotation *= -1;
			}
		}

		if (leftCast.detectPlayer && rightCast.detectPlayer) {
			if (leftCast.noWalls && rightCast.noWalls) {
				this.try = 0;
				return true;
			}
		}
	}

	update() {
		if (!STAGE_CACHE.player.dead && !this.dead) {
			//update limiters
			this.shellDelay += deltaTime;

			//update tankbody
			this.tank.updateBody();

			//rotate until it reaches goal (player hit), once it reaches goal activate some noise to avoid pinpoint accuracy

			//if the turret rotation is currently bigger than the goal rotation, make it go backwards

			//add some noise so that it swings once it locks on
			if (this.noise) {
				this.noiseDelay += deltaTime;

				if (this.noiseDelay > this.noiseAmount) {
					this.noiseDelay = 0;
					this.turretRotation *= -1;
					this.noise = false;
				}
			}

			this.tank.turretAngle += this.turretRotation;

			const shootCoordinates = new xy(1500 * Math.cos(this.tank.turretAngle) + this.tank.centerX, 1500 * Math.sin(this.tank.turretAngle) + this.tank.centerY);

			const ray = new Ray(new xy(this.tank.centerX, this.tank.centerY), shootCoordinates);

			//check if ray hits player after exhausting all ricochetes
			//brown tank shoots normal bullet. it can only ricochet once
			if (this.shouldFire(ray) && this.shellDelay > 10) {
				//it found the ray to fire upon
				this.shellDelay = 0;
				this.tank.shoot(shootCoordinates, NORMAL_SHELL, this.tankID);
			}
		}

		//update particles
		this.tank.updateParticles();
	}

	trackUpdate() {
		if (!this.dead) {
			this.tank.trackUpdate();
		}
	}

	explode() {
		//die
		this.dead = true;
		this.tank.explodeTank();

		//start intermission
		//the last enemy tank has been killed, you win this match!
		if (checkGameOver()) {
			intermissionStatus = INTERMISSION_WON;
			INTERMISSION = true;
		}

		//add grave
		STAGE_CACHE.graves.push(new Grave(this.tank.centerX - GRAVE_WIDTH / 2, this.tank.centerY - GRAVE_HEIGHT / 2, this.tank.color));
	}

	render() {
		this.tank.render(this.dead);
	}

	renderShadow() {
		this.tank.renderShadow(this.dead);
	}
}

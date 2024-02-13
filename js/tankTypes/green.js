class GreenTank {
	constructor(x, y, angle, turretAngle) {
		//ID
		this.tankID = Math.floor(Math.random() * 100000);

		this.tankType = GREEN_TANK;
		this.tank = new Tank(x, y, angle, turretAngle, "#3AB02E", "#37A62B", "#B0896B", 0, 0, this.tankID, this.tankType);
		this.bounces = 10;
		this.dead = false;

		this.shellDetectionRadius = 100;

		//turret update
		this.noiseMax = 0.8;
		this.noiseMin = 0.1;
		this.noise = false;
		this.noiseDelay = 0;
		this.noiseAmount = ((Math.random() * (this.noiseMax - this.noiseMin) + this.noiseMin));
		this.turretRotation = 80 * deltaTime * Math.PI / 180;
		this.shellDelay = 0.1;
		this.shellShot = 0;
	}

	//cast a ray to player
	castToPlayer(ray, angle, bouncesLeft, firstShot, collidedSideID) {
		//check for comrade collisions overall. If a ray has a comrade collision it should not be taken
		const comradeCollision = getComradeCollisions(ray, angle, firstShot, this.tankID);

		if (!comradeCollision.reflection) {
			//it doesn't matter how many bounces are left, it matters if the tank is still alive. check for incoming shells and remove the threat
			const shellCollision = getShellCollisions(ray, angle);

			//check if shell is within a certain target radius, aka close enough for it to be a threat
			if (shellCollision.dist <= this.shellDetectionRadius) {
				//check if any walls are in the way
				const wallCollision = getWallCollisions(new Ray(ray.pointA, shellCollision.reflection.point), angle, collidedSideID);

				if (!wallCollision.reflection) {
					//no walls are in the way!

					/*technically did not detect player, but that's what i will use for object detection*/
					return {
						detectPlayer: true,
						noWalls: true
					};
				}

				//if there was a wall collision, then continue normally
			}

			const playerCollision = getPlayerCollisions(ray, angle, true);

			if (bouncesLeft > 0) {
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
						//bounce off the wall we have detected!
						return this.castToPlayer(wallCollision.reflection.newRay, wallCollision.reflection.newAngle, bouncesLeft - 1, false, wallCollision.id);
					}
				} else {
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
				}
			} else {
				//must hit player on last round
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

		if (leftCast.detectPlayer && rightCast.detectPlayer) {
			if (leftCast.noWalls && rightCast.noWalls) {
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

			//update turret
			this.goalRot = Math.atan2(STAGE_CACHE.player.tank.y - this.tank.y, STAGE_CACHE.player.tank.x - this.tank.x);

			//adjust angles to stay with bounds
			if (Math.sign(this.goalRot) !== 1) {
				this.goalRot += 2 * Math.PI;
			}

			if (Math.sign(this.tank.turretAngle) !== 1) {
				this.tank.turretAngle += 2 * Math.PI;
			}

			this.goalRot %= 2 * Math.PI;
			this.tank.turretAngle %= 2 * Math.PI;

			this.tank.turretAngle += this.turretRotation;

			//noise to make turret swing
			if (this.noise) {
				this.noiseDelay += deltaTime;

				if (this.noiseDelay > this.noiseAmount) {

					//RNG noise amount
					this.noiseAmount = ((Math.random() * (this.noiseMax - this.noiseMin) + this.noiseMin));

					this.noiseDelay = 0;
					this.turretRotation *= -1;
					this.noise = false;
				}
			} else {
				//check if goalRot has been met :)
				if (this.tank.turretAngle < this.goalRot) {
					//if this used to be under...
					if (this.tank.turretAngle + (5 * Math.PI / 180) >= this.goalRot) {
						this.noise = true;
					}
				} else {
					//if this used to be over...
					if (this.tank.turretAngle - (5 * Math.PI / 180) <= this.goalRot) {
						this.noise = true;
					}
				}
			}

			this.tank.turretAngle += this.turretRotation;

			const shootCoordinates = new xy(1500 * Math.cos(this.tank.turretAngle) + this.tank.centerX, 1500 * Math.sin(this.tank.turretAngle) + this.tank.centerY);

			const ray = new Ray(new xy(this.tank.centerX, this.tank.centerY), shootCoordinates);

			//check if ray hits player after exhausting all ricochetes
			//green tank shoots 2 very fast missles that ricochet twice
			if (this.shouldFire(ray) && this.shellDelay > 0.2 && this.shellShot < 3) {
				//it found the ray to fire upon
				this.shellDelay = 0;
				this.shellShot++;
				this.tank.shoot(shootCoordinates, ULTRA_MISSLE, this.tankID);
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

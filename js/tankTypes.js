function checkGameOver() {
	for (var i = 0; i < STAGE_CACHE.enemies.length; i++) {
		//game is not over if an enemy tank is still alive
		if (!STAGE_CACHE.enemies[i].dead) {
			return false;
		}
	}
	return true;
}

//TANK TYPES
//color code: bodyColor, turretColor, sideColor
class Player {
	constructor(x, y, angle, turretAngle) {
		//ID
		this.tankID = PLAYER_ID;

		this.tank = new Tank(x, y, angle, turretAngle, "#224ACF", "#1E42B8", "#0101BA", 100, 3, this.tankID);
		this.dead = false;

		//makes tank "shock" aka pause for a split second due to recoil from shot or mine
		this.tankShock = 0;

		//delays shell spamming
		this.shellDelay = 0.1;

		//caps number of shells to be shot/keeps track of how many shells are shot by this tank
		this.shellShot = 0;

		//caps number of mines layed
		this.mineLayed = 0;

		//delays mine spamming
		this.mineDelay = 50;

		this.keys = {};
	}

	update() {
		//update tankBody
		this.tank.updateBody();

		//update turret angle
		this.tank.turretAngle = Math.atan2(MOUSE_POS.y - this.tank.centerY, MOUSE_POS.x - this.tank.centerX);

		//update tankShock
		this.tankShock += deltaTime;

		//update shellDelay
		this.shellDelay += deltaTime;

		//update mineDelay
		this.mineDelay += deltaTime;

		//update movement
		const xInc = this.tank.speed * Math.cos(this.tank.angle) * deltaTime;
		const yInc = this.tank.speed * Math.sin(this.tank.angle) * deltaTime;

		//if tank is NOT SHELLSHOCKED and isn't dead
		if (this.tankShock > 0 && !this.dead) {
			//up
			if (this.keys[87] || this.keys[38]) {
				this.tank.x += xInc;
				this.tank.y += yInc;
			}

			//down
			if (this.keys[83] || this.keys[40]) {
				this.tank.x -= xInc;
				this.tank.y -= yInc;
			}

			//right rotation
			if (this.keys[65] || this.keys[37]) {
				this.tank.angle -= this.tank.rotationSpeed * deltaTime;
			}

			//left rotation
			if (this.keys[68] || this.keys[39]) {
				this.tank.angle += this.tank.rotationSpeed * deltaTime;
			}

			//check for keybind for laying mines
			if (this.keys[32]) {
				//lay mine
				this.layMine();
				delete this.keys[32];
			}
		}

		//update particles
		this.tank.updateParticles();
	}
	
	explode() {
		//die
		this.dead = true;
		this.tank.explodeTank();

		//start intermission
		INTERMISSION = true;

		//add grave
		STAGE_CACHE.graves.push(new Grave(this.tank.centerX - GRAVE_WIDTH / 2, this.tank.centerY - GRAVE_HEIGHT / 2, this.tank.color));
	}

	shoot() {
		//delay shell fire rate && cap shell amount && isn't dead
		if (this.shellDelay > 0.1 && this.shellShot < 5 && !this.dead) {
			this.tankShock = -0.1;
			this.shellShot++;
			this.shellDelay = 0;

			this.tank.shoot(MOUSE_POS, NORMAL_SHELL, this.tankID);		
		}
	}

	layMine() {
		if (this.mineLayed < 2 && this.mineDelay > 2) {
			this.tankShock = -0.2;
			this.mineLayed++;
			this.mineDelay = 0;

			this.tank.layMine(this.tankID);
		}
	}

	trackUpdate() {
		if (!this.dead) {
			this.tank.trackUpdate();			
		}
	}

	render() {
		this.tank.render(this.dead);
	}

	renderShadow() {
		this.tank.renderShadow(this.dead);
	}
}

class BrownTank {
	constructor(x, y, angle, turretAngle) {
		//ID
		this.tankID = Math.floor(Math.random() * 100000);

		this.tank = new Tank(x, y, angle, turretAngle, "#966A4B", "#8C6346", "#B0896B", 0, 0, this.tankID);
		this.tankType = BROWN_TANK;
		this.bounces = 1;
		this.dead = false;

		//turret update
		//(90 * deltaTime) == 1.5 deg
		this.try = 0;
		this.noise = false;
		this.noiseDelay = 0;
		this.noiseAmount = 0.5;
		this.turretRotation = 90 * deltaTime * Math.PI / 180;
		this.shellDelay = 10;
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
				const playerCollision = getPlayerCollisions(ray, angle);

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

class GreyTank {
	constructor(x, y, angle, turretAngle) {
		//ID
		this.tankID = Math.floor(Math.random() * 100000);

		this.tank = new Tank(x, y, angle, turretAngle, "#4A4A4A", "#4D4D4D", "#B0896B", 80, 1, this.tankID);
		this.tankType = GREY_TANK;
		this.bounces = 1;
		this.dead = false;


		//movement update

		//makes tank "shock" aka pause for a split second due to recoil from shot or mine
		this.tankShock = 0;
		this.tankRotation = 0;
		this.uTurning = false;
		this.tankRotationDelay = 0;
		this.tankRotationCap = 0.08;

		//turret update
		this.shellDetectionRadius = 200;

		//lock on to player
		this.goalRot = turretAngle * Math.PI / 180;

		//(60 * deltaTime) == 1 deg
		this.noise = false;
		this.noiseDelay = 0;
		this.noiseAmount = 0.3;
		this.turretRotation = 90 * deltaTime * Math.PI / 180;
		this.shellDelay = 4;
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

			const playerCollision = getPlayerCollisions(ray, angle);

			if (bouncesLeft > 0) {
				//found a player collision before hitting 0 bounces!
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

	shouldFire(ray) {
		const perpAngle = getPerpAngle(this.tank.angle);
		const Cos = Math.cos(perpAngle) * SHELL_HEIGHT * MOBILE_RAY_OFFSET;
		const Sin = Math.sin(perpAngle) * SHELL_HEIGHT * MOBILE_RAY_OFFSET;
		
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
				this.try = 0;
				return true;
			}
		}
	}

	dodgeShells() {
		for (var i = 0; i < STAGE_CACHE.shells.length; i++) {
			const shell = STAGE_CACHE.shells[i];
			
			//if the shell is not diminishing
			if (!shell.diminish) {
				const playerCoord = new xy(this.tank.centerX, this.tank.centerY);
				const shellCoord = new xy(shell.centerX, shell.centerY);

				const shellDist = getRayLength(playerCoord, shellCoord);
				const playerShellAngle = Math.atan2(playerCoord.y - shellCoord.y, playerCoord.x - shellCoord.x);

				//if the shell is getting too close to the tank and the tank is heading in the same direction, back off!
				if (shellDist <= this.shellDetectionRadius) {
					const intersection = singleShellCollision(new Ray(playerCoord, shellCoord), playerShellAngle, shell);

					if (intersection.side == 1 || intersection.side == 3) {
						//shell is closer to the tank's bottom or right side
						//sharp turn right
						this.tankRotation = 1200 * deltaTime * this.tank.rotationSpeed * Math.PI / 180;
					} else {
						//shell is closer to the tank's left or top side
						//sharp turn left
						this.tankRotation = -1200 * deltaTime * this.tank.rotationSpeed * Math.PI / 180;
					}
					/*
					//hit a 180 babyyy
					this.tankRotation = 1200 * deltaTime * this.tank.rotationSpeed * Math.PI / 180;
					*/			
				}
			}
		}
	}

	getRandomBodyRot() {
		//return a random rotation for the tank to travel with in radians
		//degree difference from -10 to 10
		const max = 600;
		const min = -600;
		return ((Math.random() * (max - min) + min) * deltaTime * this.tank.rotationSpeed) * Math.PI / 180;
	}

	update() {
		if (!STAGE_CACHE.player.dead && !this.dead) {
			//update limiters
			this.shellDelay += deltaTime;

			//update tankShock
			this.tankShock += deltaTime;

			//update tank angle
			this.tankRotationDelay += deltaTime;

			//update tankbody
			this.tank.updateBody();

			if (this.tankRotationDelay > this.tankRotationCap) {
				this.tankRotationDelay = 0;
				this.tank.angle += this.tankRotation;

				const foreignCollision = getForeignCollisions(this.tank);
				if (foreignCollision) {
					//about to collide, don't idle
					switch (foreignCollision) {
						case U_TURN:
							//hit a 180 babyyy
							this.tankRotation = 10800 * deltaTime * this.tank.rotationSpeed * Math.PI / 180;
							if (!this.uTurning) {
								this.uTurning = true;
								this.tank.speed /= 2;
							}
							break;
						case TURN_LEFT:
							//5 degrees
							this.tankRotation = 300 * deltaTime * this.tank.rotationSpeed * Math.PI / 180;
							if (this.uTurning) {
								this.uTurning = false;
								this.tank.speed *= 2;
							}
							break;
						case TURN_RIGHT:
							//-5 degrees
							this.tankRotation = -300 * deltaTime * this.tank.rotationSpeed * Math.PI / 180;
							if (this.uTurning) {
								this.uTurning = false;
								this.tank.speed *= 2;
							}
							break;
					}

					this.tankRotation += this.getRandomBodyRot();
				} else {
					if (this.uTurning) {
						this.uTurning = false;
						this.tank.speed *= 2;
					}

					this.tankRotation = this.getRandomBodyRot();
				}

				this.dodgeShells();
			}

			//update movement if tank is not shocked!
			if (this.tankShock > 0) {
				const xInc = this.tank.speed * Math.cos(this.tank.angle) * deltaTime;
				const yInc = this.tank.speed * Math.sin(this.tank.angle) * deltaTime;

				this.tank.x += xInc;
				this.tank.y += yInc;
			}

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

			//update shooting
			const shootCoordinates = new xy(1500 * Math.cos(this.tank.turretAngle) + this.tank.centerX, 1500 * Math.sin(this.tank.turretAngle) + this.tank.centerY);

			const ray = new Ray(new xy(this.tank.centerX, this.tank.centerY), shootCoordinates);

			//grey tanks shoots normal bullet. it can only ricochet once
			if (this.shouldFire(ray) && this.shellDelay > 8) {
				//it found the ray to fire upon
				this.shellDelay = 0;
				this.tankShock = -0.1;
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
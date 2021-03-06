var BULLET_SPEED = 150;
var DEBRIS_SPEED = 60;
var DEBRIS_DAMPING = 0.99995;
var ANGULAR_DEBRIS_DAMPING = 0.995;

var WEAPONS = {
    shotgun: {
        name: 'shotgun',
        ammo: 6,
        fire: function (sprite, targetX, targetY, clickTime) {
            var diff = game.time.now - sprite.lastShot;
            if (diff < 250 || (sprite == player && sprite.lastClick === clickTime)) {
                return;
            }

            sprite.lastShot = game.time.now;
            sprite.lastClick = clickTime;

            if (sprite.ammo > 0) {
                sprite.ammo--;

                for (var i = 0; i < 5; i++) {
                    console.log('Shooting shotgun from ' + sprite.x + ',' + sprite.y + ' to ' + targetX + ',' + targetY);

                    var bulletX = sprite.x + this.offsets[sprite.frame % 8][0];
                    var bulletY = sprite.y + this.offsets[sprite.frame % 8][1];

                    var spray = 3;
                    var angle = Math.atan2(targetY - bulletY, targetX - bulletX) + game.math.degToRad(-2 * spray + i * spray);
                    spawnBullet(bulletX, bulletY, angle, sprite);
                }

                sounds['shotgun'].play();

            } else {
                sounds['gun_click'].play();
            }
        }, offsets: [
            [0, -4],
            [3, -3],
            [3, 0],
            [2, 3],
            [-1, 3],
            [-4, 2],
            [-4, -1],
            [-3, -4],
        ]
    },
    assault_rifle: {
        name: 'assault_rifle',
        ammo: 30,
        fire: function (sprite, targetX, targetY, clickTime) {
            var diff = game.time.now - sprite.lastShot;
            if (diff < 120) {
                return;
            }

            sprite.lastShot = game.time.now;

            if (sprite.ammo > 0) {
                sprite.ammo--;

                console.log('Shooting assault rifle from ' + sprite.x + ',' + sprite.y + ' to ' + targetX + ',' + targetY);

                var bulletX = sprite.x + this.offsets[sprite.frame % 8][0];
                var bulletY = sprite.y + this.offsets[sprite.frame % 8][1];

                var angle = Math.atan2(targetY - bulletY, targetX - bulletX) + game.math.degToRad(-1 + Math.random() * 2);
                spawnBullet(bulletX, bulletY, angle, sprite);

                sounds['assault_rifle'].play();

            } else {
                sounds['gun_click'].play();
            }
        }, offsets: [
            [1, -4],
            [3, -2],
            [3, 1],
            [1, 3],
            [-2, 3],
            [-4, 1],
            [-4, -2],
            [-2, -4],
        ]
    },
    fist: {
        name: 'fist',
        fire: function (sprite, targetX, targetY, clickTime) {
            var diff = game.time.now - sprite.lastShot;
            if (diff < 200 || (sprite == player && sprite.lastClick === clickTime)) {
                return;
            }

            if (sprite === player) {
                for (var i = 0; i < enemies.length; i++) {
                    var enemy = enemies[0];
                    var boundsA = player.getBounds().inflate(2, 2);
                    var boundsB = enemy.getBounds();

                    if (Phaser.Rectangle.intersects(boundsA, boundsB)) {
                        kill(enemy, 'enemy_dead');

                        // Remove enemy
                        enemies.splice(i, 1);
                        enemy.destroy();

                        break;
                    }
                }
            } else {
                // Don't swing far away
                if (game.math.distance(sprite.x, sprite.y, player.x, player.y) > 6) {
                    return;
                } else {
                    var boundsA = player.getBounds().inflate(2, 2);
                    var boundsB = sprite.getBounds();

                    if (Phaser.Rectangle.intersects(boundsA, boundsB)) {
                        player.dead = true;
                        player.visible = false;
                        kill(player, 'player_dead');
                    }
                }
            }

            sprite.lastShot = game.time.now;

            sounds['swing'].play();
            sprite.weaponSprite.visible = true;
            window.setTimeout(function () {
                sprite.weaponSprite.visible = false;
            }, 100);
        }
    }
}

function spawnBullet(x, y, angle, fromSprite) {
    var bullet = game.add.sprite(x, y, 'bullet');
    game.physics.p2.enable(bullet);
    bullet.body.setCollisionGroup(bulletCollisionGroup);
    bullet.body.mass = 1000;
    bullet.body.data.isBullet = true;
    bullet.body.data.fromPlayer = fromSprite;
    bullet.body.debug = PHYSICS_DEBUG;
    bullet.body.collides([staticCollisionGroup, dynamicCollisionGroup]);

    bullet.body.onBeginContact.add(function (body, bodyB, shapeA, shapeB, equation) {
        if (!body) {
            bullet.destroy();
            return;
        }

        if (body._collisionGroup == 'static') {
            spawnParticles(bullet.x, bullet.y, 'debris', Math.floor(Math.random() * 2) + 1, angle, 45);
            sounds['hit_wall'].play();
        } else if (body._collisionGroup == 'dynamic') {
            var hit = body.sprite;
            if (fromSprite === hit) {
                return;
            }

            if (hit === player) {
                player.dead = true;
                player.visible = false;
                kill(player, 'player_dead');
            } else {
                var hitEnemy = false;
                for (var i = 0; i < enemies.length; i++) {
                    var enemy = enemies[i];
                    if (hit === enemy) {
                        kill(enemy, 'enemy_dead');

                        // Remove enemy
                        enemies.splice(i, 1);
                        enemy.destroy();

                        hitEnemy = true;
                    }
                }

                if (!hitEnemy) {
                    sounds['hit_wall'].play();
                }
            }
        }

        bullet.destroy();
    }, this);

    bullet.body.rotation = angle + game.math.degToRad(90);
    bullet.body.velocity.x = Math.cos(angle) * BULLET_SPEED;
    bullet.body.velocity.y = Math.sin(angle) * BULLET_SPEED;
}

function spawnParticles(x, y, type, num, angle, maxAngle) {
    for (var i = 0; i < num; i++) {
        var debris = game.add.sprite(x, y, type);
        game.physics.p2.enable(debris);
        debris.body.clearShapes();

        var debrisAngle = game.math.degToRad(game.math.radToDeg(angle) + 180 + (-maxAngle + Math.random() * 2 * maxAngle) % 360);
        debris.body.angle = debrisAngle;
        debris.body.damping = DEBRIS_DAMPING;
        debris.body.velocity.x = Math.cos(debrisAngle) * DEBRIS_SPEED * Math.random();
        debris.body.velocity.y = Math.sin(debrisAngle) * DEBRIS_SPEED * Math.random();
        debris.body.angularDamping = ANGULAR_DEBRIS_DAMPING;
        debris.body.angularVelocity = DEBRIS_SPEED * (-0.5 + Math.random());
    }
}

function kill(sprite, corpse) {
    // Add corpse
    var dead = game.add.sprite(sprite.x, sprite.y, corpse);
    dead.frame = Math.round((sprite.frame % 8) / 2);
    dead.anchor.set(0.5);

    // Splatter blood
    spawnParticles(sprite.x, sprite.y, 'blood', 10, sprite.body.rotation, 180);

    spawnPickup(sprite);

    sounds['splat'].play();
}

function spawnPickup(sprite) {
    // Spawn pickup
    if (sprite.weapon && sprite.weapon.name !== 'fist') {
        var pickup = game.add.sprite(sprite.x, sprite.y, 'spacer');
        pickup.anchor.set(0.5);
        pickup.width = 5;
        pickup.height = 5;
        pickup.weapon = sprite.weapon.name;
        pickup.ammo = sprite.ammo;
        pickup.anchor.set(0.5);

        pickups.push(pickup);
    }
}
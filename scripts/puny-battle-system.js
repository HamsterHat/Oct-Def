
/**
 * 🐙 OCTOPUS DEFENCE: ULTIMATE BATTLE CORE
 * Полная версия без сокращений.
 */

// --- 1. ПЕРЕМЕННЫЕ СОСТОЯНИЯ ---
/*global.inBattle = false;
global.satisfaction = 0;
global.worldSnapshot = null;
global.worldBackup = {
    activeBoss: null,
    playerX: 0,
    playerY: 0,
    sector: null,
    turretPower: 0
};

function triggerGameOver() {
    global.inBattle = false;
    
    // 1. Восстанавливаем базу из снапшота, чтобы было что взрывать
    restoreWorldState();

    // 2. Ищем ядро игрока на восстановленной карте
    let core = Vars.state.teams.get(Vars.player.team()).core();
    
    if (core != null) {
        // Переносим камеру на ядро перед взрывом для драматизма
        Vars.control.input.permissive = false;
        
        Time.run(10, () => {
            // Взрываем ядро. Это официально завершает игру на секторе/волне.
            core.kill(); 
            
            // Если core.kill() не сработал мгновенно (в некоторых версиях API), 
            // используем прямой вызов поражения:
            // Events.fire(new EventType.GameOverEvent(Vars.player.team()));
        });
    } else {
        // Если ядра нет, просто вызываем экран поражения
        Events.fire(new EventType.GameOverEvent(Team.sharded));
    }
}


// --- 2. ПУЛИ С НУЛЯ (Отрисовка и Логика) ---
const hackerCodeBullet = extend(BasicBulletType, {
    damage: 45,
    speed: 4,
    lifetime: 120,
    width: 0.01, // Скрываем основное тело
    height: 0.01,
    hitEffect: Fx.lightningCharge,
    despawnEffect: Fx.smokeCloud,

    draw(b) {
        // Динамический цвет (мерцание циана и белого)
        Draw.color(Color.cyan, Color.white, Mathf.absin(Time.time, 1, 0.3));
        
        // Рисуем "цифровой шлейф" из трех полосок разной длины
        for(let i = 0; i < 3; i++){
            let length = (this.height + Mathf.absin(Time.time + i * 2, 2, 6)) * b.fout();
            let offset = i * 3 - 3;
            Fill.rect(
                b.x + Angles.trnsx(b.rotation() + 90, offset), 
                b.y + Angles.trnsy(b.rotation() + 90, offset), 
                2, 
                length, 
                b.rotation() + 90
            );
        }
        
        // Добавляем маленькие "биты" (квадратики) по бокам
        if(Mathf.chanceDelta(0.2)){
            Fill.square(b.x + Mathf.range(6), b.y + Mathf.range(6), 1.5);
        }
    }
});

// Осколок звезды (вместо ванильной меди)
const starShard = extend(BasicBulletType, {
    damage: 15,
    speed: 5,
    lifetime: 25,
    width: 2,
    height: 6,
    shrinkY: 1,
    frontColor: Color.yellow,
    backColor: Color.orange,
    trailLength: 5,
    trailWidth: 1,
    trailColor: Color.yellow
});

const cosmicStar = extend(BasicBulletType, {
    damage: 60,
    speed: 3,
    lifetime: 140,
    hitEffect: Fx.sapExplosion,
    
    draw(b) {
        let size = 10 * b.fin();
        let rot = b.time * 5;
        
        // Ядро звезды
        Draw.color(Color.white, Color.yellow, b.fin());
        Fill.poly(b.x, b.y, 4, size, rot);
        
        // Второе перекрестие (эффект сияния)
        Draw.color(Color.orange);
        Fill.poly(b.x, b.y, 4, size * 0.6, rot + 45);
        
        // Внешний ореол
        Lines.stroke(2 * b.fout());
        Lines.poly(b.x, b.y, 4, size + 2, rot);
    },

    despawned(b) {
        // Выстреливаем кастомными осколками во все стороны
        for(let i = 0; i < 5; i++) {
            starShard.create(b.owner, b.team, b.x, b.y, i * 72);
        }
        // Эффект вспышки при распаде
        Fx.instShoot.at(b.x, b.y, Color.yellow);
    }
});


Events.run(Trigger.update, () => {
    if (global.inBattle) {
        let boss = Groups.unit.find(u => u.team == Team.green);
        let player = Vars.player.unit();

        if (boss) {
            if (!global.isEnemyTurn) {
                // ВАШ ХОД: Босс не должен стрелять
                boss.isShooting = false; // Глобальный флаг стрельбы юнита
                
                if (boss.mounts != null) {
                    for (let i = 0; i < boss.mounts.length; i++) {
                        boss.mounts[i].shoot = false; // Отключаем стрельбу каждой пушки
                        boss.mounts[i].rotate = false; // Запрещаем им вращаться за вами
                    }
                }
            } else {
                // ХОД БОССА: Разрешаем всё
                boss.isShooting = true;
                if (player != null) boss.lookAt(player.x, player.y);
                
                if (boss.mounts != null) {
                    for (let i = 0; i < boss.mounts.length; i++) {
                        boss.mounts[i].shoot = true;
                    }
                }
            }
        }
    }
});


// --- 3. НАЧАЛО БОЯ (ЗАГРУЗКА АРЕНЫ) ---
global.startPunyBattle = function(boss) {
    if (global.inBattle) return;

    // 1. АВТОСОХРАНЕНИЕ
    try {
        if (Vars.state.isCampaign()) {
            Vars.control.saves.saveCurrent();
            Log.info("Progress autosaved before battle.");
        }
    } catch(e) { Log.err("Autosave failed: " + e); }

    // 2. СБОР ДАННЫХ БАЗЫ
    let dps = 0;
    Groups.build.each(b => {
        if(b.team == Vars.player.team() && b instanceof Turret.TurretBuild) {
            let bull = b.block.shootType;
            dps += (bull.damage + (bull.splashDamage || 0)) * (60 / b.block.reload);
        }
    });
    global.worldBackup.turretPower = dps;

    // 3. СОХРАНЕНИЕ СОСТОЯНИЯ МИРА
    saveWorldState();
    global.worldBackup.activeBoss = boss;
    global.worldBackup.playerX = Vars.player.x;
    global.worldBackup.playerY = Vars.player.y;

    // 4. ЗАГРУЗКА battle_arena.msav
    // Используем внутреннее дерево ресурсов мода
    let arena = Vars.tree.get("maps/battle_arena.msav"); 
    
    if (arena != null) {
        Vars.world.loadMap(arena);
    } else {
        // Если файла нет — чистим текущее место и ставим ТРАВУ
        Log.warn("battle_arena.msav not found! Using grass fallback.");
        for(let x = 0; x < Vars.world.width(); x++) {
            for(let y = 0; y < Vars.world.height(); y++) {
                Vars.world.tile(x, y).setBlock(Blocks.air);
                Vars.world.tile(x, y).setFloor(Blocks.grass.asFloor());
            }
        }
    }

    Vars.state.rules.unitCap = 9999;
    global.inBattle = true;
    global.satisfaction = 0;

    // Спавн в центре (unitWidth/Height — это координаты в пикселях)
    boss.type.spawn(Team.green, Vars.world.unitWidth()/2, Vars.world.unitHeight()/2 + 100);
    if(Vars.player.unit()) Vars.player.unit().set(Vars.world.unitWidth()/2, Vars.world.unitHeight()/2 - 100);
    
    openMainBattleUI();
}


// 1. КАСТОМНЫЕ ЭФФЕКТЫ (VFX)
const baseShellTrail = new Effect(30, e => {
    Draw.color(Color.orange, Color.red, e.fin());
    Lines.stroke(3 * e.fout());
    Lines.line(e.x, e.y, e.data.x, e.data.y); // Трассер снаряда
    Fill.circle(e.x, e.y, 2 * e.fout()); // Голова снаряда
});

const baseExplosionVFX = new Effect(40, e => {
    Draw.color(Color.gold, Color.orange, e.fin());
    Lines.stroke(2 * e.fout());
    Lines.circle(e.x, e.y, 4 + e.fin() * 20); // Ударная волна
    
    Draw.color(Color.gray);
    Angles.randLenVectors(e.id, 8, 2 + 30 * e.fin(), (x, y) => {
        Fill.circle(e.x + x, e.y + y, e.fout() * 4); // Осколки/дым
    });
});

// 2. ФУНКЦИЯ АТАКИ
function baseSupportAttack(target) {
    let shots = 8; // Количество снарядов
    
    for(let i = 0; i < shots; i++) {
        Time.run(i * 6, () => {
            if(!target || !target.active) return;

            // Генерируем случайную точку старта "в небе"
            let startX = target.x + Mathf.range(250);
            let startY = target.y + 500;
            
            // Точка попадания с небольшим разбросом вокруг босса
            let tx = target.x + Mathf.range(15);
            let ty = target.y + Mathf.range(15);

            // Запуск кастомного трассера снаряда
            baseShellTrail.at(startX, startY, 0, Color.white, {x: tx, y: ty});

            // Задержка перед взрывом (время "полета")
            Time.run(10, () => {
                // Наш кастомный взрыв
                baseExplosionVFX.at(tx, ty);
                
                // Тряска экрана и звук
                Effect.shake(3, 3, tx, ty);
                Sounds.explosion.at(tx, ty, 0.8 + Mathf.random(0.4));
                
                // Наносим часть урона за каждый снаряд
                target.damage((50 + global.worldBackup.turretPower * 3) / shots);
            });
        });
    }
}


// Добавляем метод say всем юнитам через прототип
Unit.prototype.say = function(text){
    // Создаем "облачко" текста над юнитом
    new Effect(120, e => {
        let font = Fonts.outline;
        let oldScaleX = font.getData().scaleX;
        let oldScaleY = font.getData().scaleY;
        
        font.getData().setScale(0.3);
        font.setColor(Color.white);
        
        // Рисуем текст, который следует за юнитом (e.x, e.y)
        font.draw(text, e.x, e.y + 15, 0, Align.center, false);
        
        font.getData().setScale(oldScaleX, oldScaleY);
    }).at(this.x, this.y);
};



function openActionSubMenu(parentDialog) {
    const actions = new BaseDialog("ДЕЙСТВИЯ");
    let boss = Groups.unit.find(u => u.team == Team.green);
    let player = Vars.player.unit();

    if (!boss || !player) {
        actions.add("Цель не найдена").row();
        actions.addCloseButton();
        actions.show();
        return;
    }

    actions.cont.pane(t => {
        // --- 1. ОБЩЕЕ: ОСМОТР ---
        t.button("Осмотреть", () => {
            actions.hide(); 
            parentDialog.hide();
            let info = "[#aaffd4]" + boss.type.name.toUpperCase() + "[]\n" +
                       "[white]Здоровье: " + Math.floor(boss.health) + " / " + Math.floor(boss.maxHealth) + "\n" +
                       "Защита: " + boss.type.armor + "\n" +
                       "[gray]Пощада: " + global.satisfaction + "%";
            Vars.ui.announce(info);
            startEnemyTurn();
        }).size(320, 60).row();

        // --- 2. УНИКАЛЬНОЕ: ХАКЕР (SANS-STYLE) ---
        if (boss.type.name.includes("haker")) {
            
            // Шутка - лучший путь к миру
            t.button("Пошутить про код", () => {
                actions.hide(); parentDialog.hide();
                global.satisfaction += 50;
                boss.say("хе-хе. у тебя неплохое чувство юмора для куска меди.");
                showActionEffect(player, "+50%", Color.cyan);
                startEnemyTurn();
            }).size(320, 60).row();

            // Взлом - ЛОВУШКА
            t.button("Попробовать взломать", () => {
                actions.hide(); parentDialog.hide();
                boss.say("ты серьезно? пытаешься взломать МЕНЯ?");
                
                Time.run(30, () => {
                    if(player) {
                        player.damage(15); // Наказание
                        Fx.explosion.at(player.x, player.y, 0, Color.cyan);
                        showActionEffect(player, "ACCESS DENIED", Color.red);
                    }
                });
                startEnemyTurn();
            }).size(320, 60).row();

            // Критика кода
            t.button("Критиковать синтаксис", () => {
                actions.hide(); parentDialog.hide();
                global.satisfaction = Math.max(0, global.satisfaction - 20);
                boss.say("ой, да неужели? иди учи питон, малявка.");
                showActionEffect(boss, "РАЗДРАЖЕНИЕ", Color.orange);
                startEnemyTurn();
            }).size(320, 60).row();
        }

        // --- 3. УНИКАЛЬНОЕ: ВОЕННЫЙ (VOEN-PUN) ---
        else if (boss.type.name.includes("voen-pun")) {
            
            t.button("Отдать честь", () => {
                actions.hide(); parentDialog.hide();
                global.satisfaction += 35;
                boss.say("Вольно. Вижу, в этой базе осталась хоть какая-то дисциплина.");
                showActionEffect(player, "+35%", Color.gold);
                startEnemyTurn();
            }).size(320, 60).row();

            t.button("Оспорить приказ", () => {
                actions.hide(); parentDialog.hide();
                boss.apply(StatusEffects.boss, 400); // Впадает в ярость
                boss.say("ТЫ КТО ТАКОЙ, ЧТОБЫ МНЕ ПЕРЕЧИТЬ?!");
                showActionEffect(boss, "ЯРОСТЬ!", Color.red);
                startEnemyTurn();
            }).size(320, 60).row();

            t.button("Попросить снабжение", () => {
                actions.hide(); parentDialog.hide();
                player.health += 50; // Немного хилит
                boss.say("Снабжение? Сначала заслужи его в бою.");
                showActionEffect(player, "+50 HP", Color.green);
                startEnemyTurn();
            }).size(320, 60).row();
        }

        // --- 4. ДЛЯ ОСТАЛЬНЫХ ЮНИТОВ ---
        else {
            t.button("Поговорить", () => {
                actions.hide(); parentDialog.hide();
                global.satisfaction += 15;
                boss.say("...");
                showActionEffect(player, "Пунь пань пунь!", Color.white);
                startEnemyTurn();
            }).size(320, 60).row();
            
            t.button("Угрожать", () => {
                actions.hide(); parentDialog.hide();
                boss.apply(StatusEffects.slow, 200);
                showActionEffect(boss, "ПУНЬ!", Color.gray);
                startEnemyTurn();
            }).size(320, 60).row();
        }

    }).size(380, 500);

    actions.addCloseButton();
    actions.show();
}


function showActionEffect(target, text, color) {
    if(!target) return;

    new Effect(70, e => {
        let font = Fonts.outline;
        
        // 1. Сохраняем текущий масштаб
        let oldScaleX = font.getData().scaleX;
        let oldScaleY = font.getData().scaleY;
        
        // 2. Устанавливаем свой масштаб (0.25 - 0.3 оптимально)
        font.getData().setScale(0.25);
        
        // 3. Цвет и прозрачность
        font.setColor(color);
        font.getCache().setAlphas(e.fout());

        // 4. Отрисовка (центрирование текста)
        font.draw(text, e.x, e.y + 10 + (e.fin() * 40), 0, Align.center, false);
        
        // 5. Возвращаем старый масштаб (oldScale)
        font.getData().setScale(oldScaleX, oldScaleY);
    }).at(target.x, target.y);
}



function openMainBattleUI() {
    const dialog = new BaseDialog("[#aaffd4]OCTOPUS TERMINAL[]");
    
    // 3. ОБНОВЛЕННАЯ КНОПКА
    // (Вставь это в openMainBattleUI)
    dialog.cont.button("[white][ [#ffa500]ТУРЕЛЬ [white]]", () => {
        let boss = Groups.unit.find(u => u.team == Team.green);
        if(boss) {
            baseSupportAttack(boss);
        }
        dialog.hide();
        startEnemyTurn();
    }).size(280, 70);


    // [ ДЕЙСТВИЕ ]
    // Внутри функции openMainBattleUI найди кнопку [ ДЕЙСТВИЕ ]
    dialog.cont.button("[white][ [#00ffff]ДЕЙСТВИЕ [white]]", () => {
        // 1. Вызываем функцию подменю, передавая текущий диалог, 
        // чтобы его можно было скрыть при выборе действия
        openActionSubMenu(dialog);
    }).size(280, 70).row();


    // [ ПОСТРОЙКА ]
    dialog.cont.button("[white][ [#00ff00]ПОСТРОЙКА [white]]", () => {
        openBuildingSubMenu(dialog);
    }).size(280, 70);

    // [ МИР ]
    let canSpare = global.satisfaction >= 100;
    dialog.cont.button(canSpare ? "[white][ [#ffff00]МИР [white]]" : "[gray][ МИР ]", () => {
        if(canSpare) { processMercy(); dialog.hide(); }
    }).size(280, 70);

    dialog.show();
}


function openBuildingSubMenu(parentDialog) {
    const builds = new BaseDialog("CONSTRUCTION");
    let player = Vars.player.unit();
    let charges = global.worldBackup.healCharges;

    builds.cont.pane(t => {
        t.add("[#aaffd4]ИНЖЕНЕРНЫЙ РЕЗЕРВ[]").pad(10).row();
        t.add("[white]Доступно ремонтных модулей: [green]" + charges).pad(10).row();

        // Основная кнопка лечения
        t.button("Активировать ремонт (" + charges + ")", () => {
            if(global.worldBackup.healCharges > 0) {
                global.worldBackup.healCharges--; // Тратим заряд
                builds.hide(); parentDialog.hide();
                
                // Эффект лечения: восстанавливает 30% от макс. HP
                let healAmount = player.maxHealth * 0.3;
                player.health = Math.min(player.maxHealth, player.health + healAmount);
                
                // Кастомный VFX лечения
                Fx.heal.at(player.x, player.y);
                showActionEffect(player, "ЛЕЧЕНИЕ: +" + Math.floor(healAmount) + " HP", Color.green);
                
                startEnemyTurn();
            }
        }).size(320, 70).disabled(charges <= 0).row();

        t.add("[gray]Количество зарядов зависит от ремонтных\nблоков на вашей основной базе.").pad(10);

    }).size(400, 400);

    builds.addCloseButton();
    builds.show();
}

// --- 5. ХОД ВРАГА И СМЕРТЬ ИГРОКА ---
function startEnemyTurn() {
    if(!global.inBattle) return;
    
    global.isEnemyTurn = true; // Теперь Trigger.update разрешит пушкам стрелять

    // Босс атакует 5 секунд своим РОДНЫМ оружием
    Time.run(300, () => {
        global.isEnemyTurn = false; // TRIGGER.UPDATE снова всё выключит
        
        if(global.inBattle && Vars.player.unit() != null && Vars.player.unit().health > 0) {
            openMainBattleUI();
        }
    });
}


// Смерть игрока
Events.on(EventType.UnitDamageEvent, e => {
    // e.unit - тот, кто получил урон
    if (global.inBattle && Vars.player.unit() != null && e.unit === Vars.player.unit()) {

        
        // Если здоровье упало до нуля или ниже
        if (e.unit.health <= 0) {
            triggerGameOver();
        }
    }
});



// --- 6. ПОБЕДА (СМЕРТЬ БОССА ИЛИ МИР) ---
// А. Смерть босса
Events.on(UnitDestroyEvent, e => { 
    // Если мы в бою и погиб юнит из команды босса
    if (global.inBattle && e.unit.team === Team.green) { 
        global.inBattle = false; 

        // ВЫЗЫВАЕМ ashDisintegration ВСЕГДА ПРИ СМЕРТИ
        if(typeof ashDisintegration !== 'undefined') {
            // Передаем X, Y, поворот и спрайт юнита для распада
            ashDisintegration.at(e.unit.x, e.unit.y, e.unit.rotation, e.unit.type.fullIcon);
        }
        
        // Твой звук распада
        Sounds.sap.at(e.unit.x, e.unit.y); 

        // Мгновенное удаление сущности (всегда)
        e.unit.remove(); 

        // Задержка перед возвращением на базу
        Time.run(180, () => { 
            // Восстановление базы из сохраненного снапшота
            restoreWorldState(); 

            // Удаляем копию босса на основной карте
            Groups.unit.each(u => { 
                if(u.type === global.worldBackup.activeBoss.type) u.kill(); 
            }); 

            // Возврат игрока на исходную позицию
            if(Vars.player.unit()) {
                Vars.player.unit().set(global.worldBackup.playerX, global.worldBackup.playerY);
            }
            
            // Возвращаем управление
        }); 
    } 
});



function processMercy() {
    if(!global.inBattle) return;

    let boss = Groups.unit.find(u => u.team == Team.green);
    let player = Vars.player.unit();

    global.inBattle = false;

    // --- УНИКАЛЬНЫЕ ДИАЛОГИ ---
    if(boss) {
        if (boss.type.name.includes("haker")) {
            boss.say("хех. неплохо поиграли.\nпойду допишу этот патч за тебя.");
        } 
        else if (boss.type.name.includes("voen-pun")) {
            boss.say("Приказ отменен. Перехожу под\nваше командование, офицер.");
        } 
        else {
            boss.say("похоже, мы поняли друг друга.");
        }
    }

    Time.run(180, () => {
        // 1. Восстановление карты
        restoreWorldState();

        // 2. Вербовка босса
        Groups.unit.each(u => {
            if(u.type === global.worldBackup.activeBoss.type) {
                u.team = Team.sharded; 
                u.health = u.maxHealth;
            }
        });

        // 3. Возврат игрока
        if(player) {
            player.set(global.worldBackup.playerX, global.worldBackup.playerY);
        }

        Vars.ui.announce("[#ffff00]БОСС ТЕПЕРЬ НА ВАШЕЙ СТОРОНЕ");
    });
}*/

print("AAAAAAAAAAAAAAAA");
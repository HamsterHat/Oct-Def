/*if (typeof inBattle === 'undefined') {
    global.inBattle = false;
}*/
//require("puny-battle-system");

global.cons2 = (func) => { return new prov.prov2.Cons2({get: func}); };

const smokeBurst = new Effect(60, e => {
    Draw.color(Color.gray);
    Angles.randLenVectors(e.id, 20, e.fin() * 30, (x, y) => {
        Fill.circle(e.x + x, e.y + y, e.fout() * 5);
    });
});


Planets.tantros.alwaysUnlocked = false;
Planets.gier.alwaysUnlocked = false;
Planets.notva.alwaysUnlocked = false;
Planets.verilus.alwaysUnlocked = false;
Planets.erekir.alwaysUnlocked = false;
Planets.serpulo.alwaysUnlocked = false;

StatusEffects.boss.healthMultiplier = 3;
StatusEffects.boss.reloadMultiplier = 3;
StatusEffects.boss.speedMultiplier = 1.5;

//if(typeof inBattle === 'undefined') global.inBattle = false;

// Правильное создание цветов для JS

/*
// =========================================================================
// 1. ГЛОБАЛЬНЫЕ ОБЪЕКТЫ И ПУЛЫ ДЛЯ ОПТИМИЗАЦИИ (СОЗДАЮТСЯ 1 РАЗ ПРИ ЗАПУСКЕ)
// =========================================================================
const SharedFloatSeq = new FloatSeq(24); // 4 вершины * 6 параметров = 24 элемента
const TempColor = new Color();
const TempTargetColor = Color.valueOf("555555");
const SquareOffsets = [0, 0, 1, 0, 1, 1, 0, 1];
const GlobalPosResult = { x: 0, y: 0 };

const FragmentPool = {
    _pool: [],
    
    get: function(source, x, y, idx, ox, oy, w, h, width, height, region, rot, lif, vx, vy, vr) {
        var frag = this._pool.length > 0 ? this._pool.pop() : new DisintegrateFragment();
        
        frag.source = source; frag.x = x; frag.y = y; frag.idx = idx;
        frag.ox = ox; frag.oy = oy; frag.width = w; frag.height = h;
        frag.drawWidth = width; frag.drawHeight = height; frag.region = region;
        frag.rotation = rot; frag.lifetime = lif; frag.vx = vx; frag.vy = vy; 
        frag.vr = vr;
        frag.time = 0; 

        // ИСПРАВЛЕНИЕ: Считаем статические координаты сетки один раз при создании!
        frag.px = idx % source.width;
        frag.py = (idx / source.width) | 0;

        return frag;
    },
    
    free: function(frag) {
        frag.source = null;
        frag.region = null;
        this._pool.push(frag);
    }
};


// =========================================================================
// 2. КЛАССЫ ФИЗИКИ И СЕТКИ (БЕЗ ДИНАМИЧЕСКОГО ВЫДЕЛЕНИЯ ПАМЯТИ В КАДРЕ)
// =========================================================================
function DisintegrateFragment() {
    this.drag = 0.05;
}

DisintegrateFragment.prototype.update = function() {
    // ЕСЛИ ИГРА НА ПАУЗЕ — ПРОСТО ВЫХОДИМ И НЕ ДВИГАЕМ ЧАСТИЦЫ!
    if (Vars.state.isPaused()) return; 

    this.x += this.vx * Time.delta;
    this.y += this.vy * Time.delta;
    this.rotation += this.vr * Time.delta;

    var dt = 1 - this.drag * Time.delta;
    this.vx *= dt;
    this.vy *= dt;

    this.time += Time.delta;
};


DisintegrateFragment.prototype.inLife = function() {
    return this.time < this.lifetime;
};

DisintegrateFragment.prototype.draw = function() {
    var src = this.source;
    var cos = Mathf.cosDeg(this.rotation);
    var sin = Mathf.sinDeg(this.rotation);
    var progress = this.time / this.lifetime;
    var scl = Interp.pow5Out.apply(Mathf.clamp(1 - progress, 0, 1));

    TempColor.set(Color.white).lerp(TempTargetColor, Mathf.curve(progress, 0, 0.75));
    var color = TempColor.toFloatBits();
    var mcolr = Color.clearFloatBits;

    var xs = src.xs;
    var ys = src.ys;

    SharedFloatSeq.clear(); 

    // Размер одного кусочка текстуры
    var cellW = this.drawWidth / (this.width - 1);
    var cellH = this.drawHeight / (this.height - 1);

    for (var i = 0; i < 8; i += 2) {
        var sx = this.px + SquareOffsets[i];
        var sy = this.py + SquareOffsets[i + 1];

        var ps = src.toPos(sx, sy);
        
        // Локальное смещение вершин внутри ОДНОГО кусочка-квадрата
        var ox = (SquareOffsets[i] - 0.5) * cellW * scl;
        var oy = (SquareOffsets[i + 1] - 0.5) * cellH * scl;

        // Поворачиваем кусочек вокруг его СОБСТВЕННОГО центра и рисуем в мировых x/y
        var tx = ox * cos - oy * sin + this.x;
        var ty = ox * sin + oy * cos + this.y;

        var u = Mathf.lerp(this.region.u, this.region.u2, xs[ps]);
        var v = Mathf.lerp(this.region.v2, this.region.v, ys[ps]);

        SharedFloatSeq.add(tx);
        SharedFloatSeq.add(ty);
        SharedFloatSeq.add(color);
        SharedFloatSeq.add(u);
        SharedFloatSeq.add(v);
        SharedFloatSeq.add(mcolr);
    }

    Draw.z(Layer.flyingUnit);
    Draw.vert(this.region.texture, SharedFloatSeq.items, 0, SharedFloatSeq.size);
};


function AshDisintegrationGrid(width, height, region) {
    this.width = Math.max(3, Math.min(width, 64));
    this.height = Math.max(3, Math.min(height, 64));
    var size = this.width * this.height;

    this.xs = new Float32Array(size);
    this.ys = new Float32Array(size);

    this.region = new TextureRegion();
    if (region) this.region.set(region);

    this.set(width, height);
}

AshDisintegrationGrid.prototype.set = function(w, h) {
    w = Math.max(3, Math.min(w, 64));
    h = Math.max(3, Math.min(h, 64));
    var size = w * h;

    if (this.xs.length !== size) {
        this.xs = new Float32Array(size);
        this.ys = new Float32Array(size);
    }

    this.width = w;
    this.height = h;

    for (var x = 0; x < w; x++) {
        for (var y = 0; y < h; y++) {
            var fx = x / (w - 1);
            var fy = y / (h - 1);
            var idx = x + y * w;

            if (x > 0 && x < w - 1) fx += Mathf.range(0.25) / (w - 1);
            if (y > 0 && y < h - 1) fy += Mathf.range(0.25) / (h - 1);

            this.xs[idx] = Math.max(0, Math.min(fx, 1));
            this.ys[idx] = Math.max(0, Math.min(fy, 1));
        }
    }
};

AshDisintegrationGrid.prototype.getPos = function(pos) {
    GlobalPosResult.x = pos % this.width;
    GlobalPosResult.y = (pos / this.width) | 0; // Быстрое округление через битовый сдвиг в Rhino
    return GlobalPosResult;
};

AshDisintegrationGrid.prototype.toPos = function(x, y) {
    return x + y * this.width;
};

// =========================================================================
// 3. МЕНЕДЖЕР ЧАСТИЦ И СИСТЕМНЫЕ ХУКИ ДЛЯ ИГРЫ
// =========================================================================
const ParticleManager = {
    fragments: [],

    spawnDisintegration: function(x, y, rotation, region) {
        if (!(region instanceof TextureRegion)) return;

        const rot = rotation - 90;
        const width = region.width * Draw.scl;
        const height = region.height * Draw.scl;

        const grid = new AshDisintegrationGrid(6, 6, region);
        const cos = Mathf.cosDeg(rot);
        const sin = Mathf.sinDeg(rot);

        const maxW = 6, maxH = 6;

        for (let ix = 0; ix < maxW - 1; ix++) {
            for (let iy = 0; iy < maxH - 1; iy++) {
                let ox = 0, oy = 0;

                for (let i = 0; i < 8; i += 2) {
                    const bx = ix + SquareOffsets[i];
                    const by = iy + SquareOffsets[i + 1];
                    const pos = grid.toPos(bx, by);
                    ox += grid.xs[pos];
                    oy += grid.ys[pos];
                }
                ox /= 4;
                oy /= 4;

                // Внутри циклов ix / iy в ParticleManager.spawnDisintegration:
                const rx = (ix / (maxW - 1) - 0.5) * width;
                const ry = (iy / (maxH - 1) - 0.5) * height;

                // Это честные мировые координаты каждого кусочка на текстуре юнита!
                const wx = rx * cos - ry * sin + x;
                const wy = rx * sin + ry * cos + y;

                const lifetime = 6 * 60;

                // Базовая скорость разлёта (в точности как в формуле FlameOut)
                // Куски разлетаются от центра u.x/u.y в стороны!
                const dx = (wx - x) / 10; 
                const dy = (wy - y) / 10;

                const vx = dx + Mathf.range(0.5);
                const vy = dy + Mathf.range(0.5);
                const vr = Mathf.range(5);

                const frag = FragmentPool.get(
                    grid, wx, wy, grid.toPos(ix, iy),
                    0, 0, maxW, maxH, width, height, // ox и oy больше не нужны, передаем 0
                    region, rot, lifetime, vx, vy, vr
                );


                this.fragments.push(frag);
            }
        }
    },

    updateAndDraw: function() {
        if (this.fragments.length === 0) return;

        // Фильтруем массив: обновляем, рисуем и возвращаем в пул мертвые
        this.fragments = this.fragments.filter(f => {
            f.update();
            
            if (!f.inLife()) {
                FragmentPool.free(f); 
                return false; 
            }

            Draw.color(Color.black, Color.darkGray, Mathf.curve(f.time / f.lifetime, 0, 0.8));
            Draw.alpha(f.time / f.lifetime);
            
            f.draw(); 
            return true;
        });

        Draw.reset();
    }
};

// Сам эффект теперь пустышка-триггер на 1 тик
const ashDisintegration = new Effect(1, e => {
    ParticleManager.spawnDisintegration(e.x, e.y, e.rotation, e.data);
});

// Экспортируем эффект, чтобы его можно было вызывать из других мест/блоков
// Если ты регистрируешь его глобально, используй свой привычный метод экспорта
global.ashDisintegration = ashDisintegration;

Events.run(Trigger.draw, run(() => {
    ParticleManager.updateAndDraw();
}));*/

var TempDisRegion = new TextureRegion();
var TempDisOffVec = new Vec2();
var TempColor = new Color(1, 1, 1, 1); // ФИКС ОЗУ: один временный цвет на весь рендер

var SingleLineAshParticle = new Effect(140, function(e) {
    if (e.data == null) return;

    var ctx = e.data;
    var pixelRegion = ctx.region;

    if (pixelRegion == null || !(pixelRegion instanceof TextureRegion)) return;

    var progress = e.fin();
    
    var scl = Interp.pow5Out.apply(1.0 - progress) * Draw.scl;
    var finalSize = ctx.size * scl;
    if (finalSize <= 0.1) return;

    Draw.blend(Blending.normal);
    Draw.z(Layer.debris);

    // ФИКС КРАША: Сначала лерпаем наш временный TempColor, а потом отдаем его в Draw.color()
    TempColor.set(Color.white); // Сбрасываем в белый (оригинальный цвет)
    TempColor.lerp(ctx.colorTo, progress); // Плавно перетекаем в цвет распада
    Draw.color(TempColor);

    var drag = 0.04;
    var currentDragFactor = (1.0 - Math.exp(-drag * e.time)) / drag;

    var renderX = e.x + ctx.vx * currentDragFactor;
    var renderY = e.y + ctx.vy * currentDragFactor;
    var currentRot = e.rotation + ctx.spin * e.time;

    if (ctx.trailEffect != null && Mathf.chance(0.015 * Time.delta)) {
        var trailCol = progress < 0.4 ? ctx.sparkColor : ctx.ashColor;
        ctx.trailEffect.at(renderX, renderY, finalSize / 3, trailCol);
    }

    Draw.alpha(1.0 - Mathf.curve(progress, 0.7, 1.0));
    Draw.rect(pixelRegion, renderX, renderY, finalSize, finalSize, currentRot);
});

/**
 * ОФИЦИАЛЬНЫЙ ИСПЕПЕЛЯТОР ПО ЛИНИИ (По канонам TextureRegion.java и Pixmap.java)
 */
function Disintegrate(object, x1, y1, x2, y2, width, colorTo, sparkColor, ashColor) {
    if (!(object instanceof TextureRegion)) return;

    // Вектор линии разреза
    var lineX = x2 - x1;
    var lineY = y2 - y1;
    var lineLengthSq = lineX * lineX + lineY * lineY;
    if (lineLengthSq == 0) return;

    var baseAngle = Mathf.angle(lineX, lineY);
    
    var squareSize = 2; 
    var stepsX = Math.max(1, Math.floor(object.width / squareSize));
    var stepsY = Math.max(1, Math.floor(object.height / squareSize));

    var worldWidth = object.width * Draw.scl;
    var worldHeight = object.height * Draw.scl;
    var worldStartX = x1 - worldWidth / 2;
    var worldStartY = y1 - worldHeight / 2;

    // Прямой и безопасный доступ к пиксмапу атласа из TextureData
    var atlasPixmap = object.texture.getTextureData().getPixmap();
    if (atlasPixmap == null) return;

    for (var px = 0; px < stepsX; px++) {
        for (var py = 0; py < stepsY; py++) {
            
            // Считаем точные координаты пикселя внутри глобального листа атласа
            var tx = Math.floor(object.x + px * squareSize + squareSize / 2);
            var ty = Math.floor(object.y + py * squareSize + squareSize / 2);
            
            // Нативный вызов Pixmap.get(x, y) из твоего исходника
            var pixelColor = atlasPixmap.get(
                Mathf.clamp(tx, 0, atlasPixmap.width - 1), 
                Mathf.clamp(ty, 0, atlasPixmap.height - 1)
            );
            
            // Отсекаем воздух по альфа-каналу
            if ((pixelColor & 0x000000FF) == 0) continue;

            var segWorldX = worldStartX + (px * squareSize + squareSize / 2) * Draw.scl;
            var segWorldY = worldStartY + (py * squareSize + squareSize / 2) * Draw.scl;

            var t = Mathf.clamp(((segWorldX - x1) * lineX + (segWorldY - y1) * lineY) / lineLengthSq, 0, 1);
            var distance = Mathf.dst(segWorldX, segWorldY, x1 + t * lineX, y1 + t * lineY);

            if (distance <= width / 2) {
                var sidePush = Mathf.sign((segWorldX - x1) * lineY - (segWorldY - y1) * lineX);
                var pushAngle = baseAngle + (sidePush * 90) + Mathf.rand.range(15);
                var speed = Mathf.rand.random(40, 120);
                
                TempDisOffVec.trns(pushAngle, speed);

                // ЧИСТЫЙ ВЫЗОВ ПО ИСХОДНИКУ: Используем официальный метод .set(x, y, w, h)
                var pixelRegion = new TextureRegion(object);
                pixelRegion.set(object.x + px * squareSize, object.y + py * squareSize, squareSize, squareSize);

                SingleLineAshParticle.at(
                    segWorldX, segWorldY, 
                    pushAngle, 
                    colorTo, 
                    {
                        region: pixelRegion,
                        size: squareSize,
                        spin: Mathf.rand.range(20),
                        colorTo: colorTo,
                        trailEffect: smokeBurst, 
                        sparkColor: sparkColor,
                        ashColor: ashColor,
                        vx: TempDisOffVec.x,
                        vy: TempDisOffVec.y
                    }
                );
            }
        }
    }
}


const TempFragBaseVec = new Vec2();
const TempFragOffVec = new Vec2();
// 1. Уникальный класс физического обломка (ES5 стиль для Rhino JS)
function FragEntity(x, y, vx, vy, drag, lifetime, trailEffect, explosionEffect, damage, incend, sparkColor, ashColor, colorsTo, spin, onDespawn, update, draw, region) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.drag = drag;             
    this.lifetime = lifetime;     
    this.time = 0;                
    this.trailEffect = trailEffect; 
    this.explosionEffect = explosionEffect; 
    this.damage = damage;         
    this.incend = incend;         
    this.sparkColor = sparkColor;
    this.ashColor = ashColor;
    this.colorsTo = colorsTo;     
    this.spin = spin;             
    this.onDespawn = onDespawn;   
    this.customUpdate = update;   
    this.customDraw = draw;       
    this.region = new TextureRegion(region); 
    
    this.rotation = Mathf.rand.random(360);
    this.colorFrom = Color.white.cpy(); 
    this.size = region.width;     
}

// Методы переносим в прототип (prototype)
FragEntity.prototype.update = function() {
    var dt = Time.delta;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.spin * dt;
    
    this.vx *= (1.0 - this.drag * dt);
    this.vy *= (1.0 - this.drag * dt);
    this.time += dt;

    var progress = this.time / this.lifetime;

    if (this.trailEffect != null && Mathf.chance(0.15 * dt)) {
        var currentTrailColor = progress < 0.4 ? this.sparkColor : this.ashColor;
        this.trailEffect.at(this.x, this.y, this.size / 3, currentTrailColor);
    }

    if (this.incend && Mathf.chance(0.05 * dt)) {
        Fires.create(Vars.world.tileWorld(this.x, this.y));
    }

    if (this.customUpdate != null) this.customUpdate.run();
};

FragEntity.prototype.draw = function() {
    var progress = this.time / this.lifetime;
    if (progress >= 1) return;

    if (this.customDraw != null) {
        this.customDraw.run();
        return;
    }

    var scl = Interp.pow5Out.apply(1.0 - progress) * Draw.scl;
    var finalSize = this.size * scl;
    if (finalSize <= 0.1) return;

    Draw.z(Layer.debris); 
    Draw.blend(Blending.normal);

    Draw.color(this.colorFrom);
    if (this.colorsTo != null && this.colorsTo.size > 0) {
        var colorIdx = Math.floor(progress * this.colorsTo.size);
        colorIdx = Mathf.clamp(colorIdx, 0, this.colorsTo.size - 1);
        Draw.color().lerp(this.colorsTo.get(colorIdx), (progress * this.colorsTo.size) % 1.0);
    }

    Draw.alpha(1.0 - Mathf.curve(progress, 0.7, 1.0));
    Draw.rect(this.region, this.x, this.y, finalSize, finalSize, this.rotation);
};

FragEntity.prototype.destroy = function() {
    if (this.damage > 0) {
        Damage.damage(Vars.player.team(), this.x, this.y, this.size * 3, this.damage);
    }

    if (this.explosionEffect != null) {
        this.explosionEffect.at(this.x, this.y, this.size, this.ashColor);
    }

    if (this.onDespawn != null) this.onDespawn.run();
};

// Уникальный пул для активных обломков
const activeFragEntities = new Seq();
/**
 * Метод превращения объекта в физические осколки текстуры
 * Полностью адаптирован под Rhino JS и исходники TextureRegion.java
 */
function Fragment(object, vx, vy, cone, fragment) {
    if (!(object instanceof TextureRegion) || !(fragment instanceof FragEntity)) return;

    var segmentSize = 4; 
    var stepsX = Math.floor(object.width / segmentSize);
    var stepsY = Math.floor(object.height / segmentSize);

    var objX = fragment.x;
    var objY = fragment.y;

    var worldWidth = object.width * Draw.scl;
    var worldHeight = object.height * Draw.scl;
    var worldStartX = objX - worldWidth / 2;
    var worldStartY = objY - worldHeight / 2;

    var baseAngle = Mathf.angle(vx, vy);
    var baseSpeed = Math.sqrt(vx * vx + vy * vy);

    Draw.blend(Blending.normal);

    for (var px = 0; px < stepsX; px++) {
        for (var py = 0; py < stepsY; py++) {
            
            // ФИКС RHINO JS: Заменили let на var
            var subRegion = new TextureRegion(object);
            
            // ФИКС ПО ИСХОДНИКУ: Используем нативный .set(x, y, w, h) и публичные поля .x и .y вместо getX/Y() и setRect()
            subRegion.set(object.x + px * segmentSize, object.y + py * segmentSize, segmentSize, segmentSize);

            var startX = worldStartX + (px * segmentSize + segmentSize / 2) * Draw.scl;
            var startY = worldStartY + (py * segmentSize + segmentSize / 2) * Draw.scl;

            var fragmentAngle = baseAngle + Mathf.rand.range(cone / 2);
            var fragmentSpeed = baseSpeed * Mathf.rand.random(0.6, 1.4);
            TempFragOffVec.trns(fragmentAngle, fragmentSpeed);

            // ФИКС RHINO JS: Заменили let на var
            var frag = new FragEntity(
                startX, startY, 
                TempFragOffVec.x, TempFragOffVec.y,
                fragment.drag, fragment.lifetime + Mathf.rand.range(25),
                fragment.trailEffect, fragment.explosionEffect,
                fragment.damage, fragment.incend,
                fragment.sparkColor, fragment.ashColor,
                fragment.colorsTo,
                Mathf.rand.range(fragment.spin),
                fragment.onDespawn, fragment.customUpdate, fragment.customDraw,
                subRegion
            );

            activeFragEntities.add(frag);
        }
    }
}


// Изолированные триггеры апдейта и рендера
Events.run(Trigger.update, () => {
    for (let i = activeFragEntities.size - 1; i >= 0; i--) {
        let frag = activeFragEntities.get(i);
        frag.update();
        if (frag.time >= frag.lifetime) {
            frag.destroy();
            activeFragEntities.remove(i);
        }
    }
});

Events.run(Trigger.draw, () => {
    activeFragEntities.each(frag => frag.draw());
});


/**
 * Превращает цельную текстуру (без нарезки) в один крупный физический объект
 * @param {TextureRegion} region - Исходный целый спрайт (башня, кусок брони, декорация)
 * @param {number} vx, vy - Вектор начальной скорости полета объекта
 * @param {FragEntity} fragment - Шаблон с базовыми настройками (координаты x/y берутся отсюда)
 */
function Punch(region, vx, vy, fragment) {
    // Проверка типов данных, чтобы игра не крашилась при неверных аргументах
    if (!(object instanceof TextureRegion) || !(fragment instanceof FragEntity)) return;

    // Создаем ОДИН крупный физический объект, используя оригинальный спрайт целиком
    let punchedPiece = new FragEntity(
        fragment.x, fragment.y, // Стартовая точка берется из переданного шаблона
        vx, vy,                 // Вектор направленного импульса
        fragment.drag, 
        fragment.lifetime + Mathf.rand.range(15), // Небольшой рандом к времени жизни
        fragment.trailEffect, 
        fragment.explosionEffect,
        fragment.damage * 3,    // Крупный кусок наносит в 3 раза больше урона при деспавне/падении!
        fragment.incend, 
        fragment.sparkColor, 
        fragment.ashColor,
        fragment.colorsTo,
        Mathf.rand.range(fragment.spin), // Объект будет пафосно крутиться в полете
        fragment.onDespawn, 
        fragment.customUpdate, 
        fragment.customDraw,
        region                  // Передаем целый спрайт без нарезки
    );

    // Устанавливаем размер сущности равным реальной ширине текстуры,
    // чтобы при усыхании в пыль пропорции сохранялись правильно
    punchedPiece.size = region.width;

    // Добавляем объект в тот же самый рантайм-пул, где крутятся обычные обломки.
    // Благодаря этому он автоматически унаследует циклы апдейта, трейлов и отрисовки!
    activeFragEntities.add(punchedPiece);
}

var TempPixFragmentRegion = new TextureRegion();
var TempPixOffVec = new Vec2();
// Выносим временный цвет наверх файла ОДИН РАЗ, чтобы не плодить новые Java-объекты в каждом кадре
var TempPixColor = new Color(1, 1, 1, 1);

/**
 * Исправленный ванильный эффект ОДНОГО квантового пикселя под Rhino JS.
 * Фикс краша lerp + полная защита ОЗУ.
 */
var SinglePixelParticle = new Effect(140, function(e) {
    if (e.data == null) return;

    var ctx = e.data;
    var pixelRegion = ctx.region;

    // Безопасная проверка Java-текстуры в Rhino JS
    if (pixelRegion == null || !(pixelRegion instanceof TextureRegion)) return;

    var progress = e.fin();
    
    // Эффект усыхания пиксельной крошки в пыль по pow5Out
    var scl = Interp.pow5Out.apply(1.0 - progress) * Draw.scl;
    var finalSize = ctx.size * scl;
    if (finalSize <= 0.1) return;

    Draw.blend(Blending.normal);
    Draw.z(Layer.debris); // Слой обломков из Layer.java (20)

    // ФИКС КРАША LERP: Сначала сбрасываем TempPixColor в базовый белый цвет обшивки
    TempPixColor.set(Color.white);
    
    // Если передан Seq цветов, поочередно лерпаем TempPixColor по цепочке градиента
    if (ctx.colorsTo != null && ctx.colorsTo.size > 0) {
        var colorIdx = Mathf.clamp(Math.floor(progress * ctx.colorsTo.size), 0, ctx.colorsTo.size - 1);
        TempPixColor.lerp(ctx.colorsTo.get(colorIdx), (progress * ctx.colorsTo.size) % 1.0);
    }
    
    // Передаем готовый, плавно измененный цвет в нативный Draw Анукена
    Draw.color(TempPixColor);

    // Рассчитываем физику полета с учетом времени жизни и трения (фиксированный drag = 0.03)
    var drag = 0.03;
    var currentDragFactor = (1.0 - Math.exp(-drag * e.time)) / drag;

    var renderX = e.x + ctx.vx * currentDragFactor;
    var renderY = e.y + ctx.vy * currentDragFactor;
    var currentRot = e.rotation + ctx.spin * e.time;

    // ШЛЕЙФ ДЫМА: Спавним переданный smokeBurst прямо во время полета
    if (ctx.trailEffect != null && Mathf.chance(0.015 * Time.delta)) {
        var trailCol = progress < 0.4 ? ctx.sparkColor : ctx.ashColor;
        ctx.trailEffect.at(renderX, renderY, finalSize / 3, trailCol);
    }

    Draw.alpha(1.0 - Mathf.curve(progress, 0.7, 1.0));
    Draw.rect(pixelRegion, renderX, renderY, finalSize, finalSize, currentRot);
});

 /* УЛЬТИМАТИВНЫЙ ПОПИКСЕЛЬНЫЙ ИСПЕПЕЛЯТОР БЕЗ COPY 
 * Полностью рабочий вариант на чистом ES5 (Rhino JS) по канонам TextureRegion.java и Pixmap.java
 */
function PixelDisintegrate(object, x1, y1, x2, y2, width, colorsTo, squareSize, spread) {
    if (!(object instanceof TextureRegion)) return;

    // Вектор линии
    var lineX = x2 - x1;
    var lineY = y2 - y1;
    var lineLengthSq = lineX * lineX + lineY * lineY;
    var baseAngle = Mathf.angle(lineX, lineY);

    // --- ПРЕДОХРАНИТЕЛЬ ОТ КРАША ОЗУ ---
    var rawStepsX = Math.floor(object.width / squareSize);
    var rawStepsY = Math.floor(object.height / squareSize);
    var estimatedParticles = rawStepsX * rawStepsY;

    var finalSquareSize = squareSize;
    if (estimatedParticles > 400) {
        finalSquareSize = Math.max(squareSize * 2, Math.floor(Math.min(object.width, object.height) / 16));
    }
    // ------------------------------------

    var stepsX = Math.max(1, Math.floor(object.width / finalSquareSize));
    var stepsY = Math.max(1, Math.floor(object.height / finalSquareSize));

    var objX = x1; 
    var objY = y1;

    var worldWidth = object.width * Draw.scl;
    var worldHeight = object.height * Draw.scl;
    var worldStartX = objX - worldWidth / 2;
    var worldStartY = objY - worldHeight / 2;

    // Прямой доступ к пиксмапу атласа из TextureData по официальному исходнику Arc
    var atlasPixmap = object.texture.getTextureData().getPixmap();
    if (atlasPixmap == null) return;

    for (var px = 0; px < stepsX; px++) {
        for (var py = 0; py < stepsY; py++) {
            
            // Считываем точные координаты пикселя внутри глобального листа атласа (используем object.x и object.y)
            var tx = Math.floor(object.x + px * finalSquareSize + finalSquareSize / 2);
            var ty = Math.floor(object.y + py * finalSquareSize + finalSquareSize / 2);
            
            // Нативный вызов Pixmap.get(x, y) для проверки прозрачности
            var pixelColor = atlasPixmap.get(
                Mathf.clamp(tx, 0, atlasPixmap.width - 1), 
                Mathf.clamp(ty, 0, atlasPixmap.height - 1)
            );
            
            // Отсекаем прозрачные пиксели — воздух не взрываем!
            if ((pixelColor & 0x000000FF) == 0) continue;

            var segWorldX = worldStartX + (px * finalSquareSize + finalSquareSize / 2) * Draw.scl;
            var segWorldY = worldStartY + (py * finalSquareSize + finalSquareSize / 2) * Draw.scl;

            var shouldAnnihilate = false;
            var pvx = 0, pvy = 0;
            var pushAngle = 0;

            if (spread) {
                // SPREAD = TRUE: Игнорируем width, взрываем ВСЕ цветные пиксели радиально из центра
                shouldAnnihilate = true;
                pushAngle = Mathf.angle(segWorldX - objX, segWorldY - objY) + Mathf.rand.range(20);
                var speed = Mathf.rand.random(30, 110);
                TempPixOffVec.trns(pushAngle, speed);
                pvx = TempPixOffVec.x;
                pvy = TempPixOffVec.y;
            } else {
                // SPREAD = FALSE: Режем строго по линии шириной width
                if (lineLengthSq == 0) continue;
                var t = Mathf.clamp(((segWorldX - x1) * lineX + (segWorldY - y1) * lineY) / lineLengthSq, 0, 1);
                var distance = Mathf.dst(segWorldX, segWorldY, x1 + t * lineX, y1 + t * lineY);

                if (distance <= width / 2) {
                    shouldAnnihilate = true;
                    var sidePush = Mathf.sign((segWorldX - x1) * lineY - (segWorldY - y1) * lineX);
                    pushAngle = baseAngle + (sidePush * 90) + Mathf.rand.range(15);
                    var speed = Mathf.rand.random(40, 130);
                    
                    TempPixOffVec.trns(pushAngle, speed);
                    pvx = TempPixOffVec.x;
                    pvy = TempPixOffVec.y;
                }
            }

            if (shouldAnnihilate) {
                // ЧИСТЫЙ ВЫЗОВ ПО ИСХОДНИКУ: Нарезаем виртуальный регион через официальный метод .set(x, y, w, h)
                var pixelRegion = new TextureRegion(object);
                pixelRegion.set(object.x + px * finalSquareSize, object.y + py * finalSquareSize, finalSquareSize, finalSquareSize);

                // Отправляем пиксель Анукену в нативный Java-пул эффектов
                SinglePixelParticle.at(
                    segWorldX, segWorldY, 
                    pushAngle, 
                    Color.valueOf("00ff00"), // Лаймовый дефолтный цвет
                    {
                        region: pixelRegion,
                        size: finalSquareSize,
                        spin: Mathf.rand.range(25), // Константное квантовое вращение
                        colorsTo: colorsTo,
                        trailEffect: smokeBurst, // Твой кастомный smokeBurst шлейф
                        sparkColor: Color.valueOf("00ff00"), // Лайм
                        ashColor: Color.valueOf("00ffff"),   // Голубой
                        vx: pvx,
                        vy: pvy
                    }
                );
            }
        }
    }
}


// --- 1. THE EXP (LEVEL OF VIOLENCE) SYSTEM ---
// This tracks your "OP" (Overpower/Violence) across the whole mod.
global.PunStats = {
    exp: 0,
    lv: 1,
    op: 0, // Level of Violence / Karma

    addExp(amount) {
        this.exp += amount;
        // Level up logic (classic scaling)
        if (this.exp >= this.lv * 100) {
            this.exp = 0;
            this.lv++;
            this.op += 2; // Each level makes you slightly more "Genocidal"
            Vars.ui.showInfoToast("[#ffa500]LEVEL UP: LV " + this.lv, 3);
        }
    },

    getOP() { return this.op; },
    addOP(amount) { this.op += amount; }
};


Events.run(Trigger.update, () => {
    Groups.weather.each(w => w.weather instanceof RainWeather, w => {
        const amount = w.intensity * 20;
        if(Mathf.chance(w.intensity * 0.95) && !Vars.state.isPaused()){
            const x = Mathf.random(0, Vars.state.map.width);
            const y = Mathf.random(0, Vars.state.map.height);
            const tile = Vars.world.tile(x, y);
            if(tile.block() == Blocks.air) Puddles.deposit(tile, w.weather.liquid, amount);
        }
    });
});

Events.on(WaveEvent, e => {
    let final = Vars.tree.loadSound("final");
    let imminent = Vars.tree.loadSound("imminent");
    let guardian = Vars.tree.loadSound("guardian");
    
    if(Vars.state.rules.winWave > 0 && Vars.state.wave == Vars.state.rules.winWave){
        final.play(1, 1, 0, false, false);
    }
    
    let playImminent = Vars.state.rules.spawns.contains(boolf(spawn => spawn.getSpawned(Vars.state.wave - 1) > 0 && spawn.effect == StatusEffects.boss));
    let playGuardian = Vars.state.rules.spawns.contains(boolf(spawn => spawn.getSpawned(Vars.state.wave - 2) > 0 && spawn.effect == StatusEffects.boss));
    
    if(playImminent) imminent.play(1, 1, 0, false, false);
    if(playGuardian) guardian.play(1, 1, 0, false, false);
});



/*Events.on(UnitDestroyEvent, event => {
    if(event.unit.type.name === "mod-alex"){
        // 1. Создаем всплывающее окно с "ошибкой"
        Vars.ui.showErrorMessage("FATAL ERROR: Memory corruption at 0x99999999.");

        // 2. Ждем 2 секунды (120 тиков), чтобы игрок прочитал текст, и закрываем игру
        Timer.schedule(() => {
            Core.app.exit();
        }, 2);
    }
});*/




const octoOverlord = extend(UnitType, "overlord", {
    localizedName: "[sky]Повелитель Пуней",
    description: "Это всего лишь сосуд...",
    flying: true,
    health: 20000000,
    armor: 60000,
    speed: 5,
    accel: 0.2,
    drag: 0.1,
    hitSize: 8,
    rotateSpeed: 8,
    alwaysUnlocked: true,
    isEnemy: true,
    drawCell: false,
    outlines: false,
    createWreck: false,
    engineOffset: 0,
    engineSize: 0,
    buildSpeed: 12000000,

    init() {
        this.super$init();
        this.immunities.addAll(Vars.content.statusEffects());
    }
});

octoOverlord.constructor = () => {
    return extend(UnitEntity, {
        isAnnihilating: false,

        remove() {
            // Если уже взрываемся, просто даем движку удалить объект и выходим
            if (this.isAnnihilating) {
                this.super$remove();
                return;
            }

            this.isAnnihilating = true;
            // --- КОД ДЛЯ КОМПАКТНОГО ТИТАНА (2х2 блока, 20 млн HP) ---

            // 1. Создаем палитру квантового распада через Color.valueOf
            var bossAnnihilationColors = new Seq();
            bossAnnihilationColors.add(Color.valueOf("ffff00")); // Жёлтый
            bossAnnihilationColors.add(Color.valueOf("00ff00")); // Лайм
            bossAnnihilationColors.add(Color.valueOf("00ffff")); // Голубой



            // 3. Запускаем попиксельное испепеление всего тела во все стороны!
            PixelDisintegrate(
                this.type.fullIcon,    // Маленький спрайт босса (2х2 блока)
                0, 0, 0, 0,            // x1, y1, x2, y2 (игнорируются, так как spread = true)
                0,                     // width (игнорируется при spread = true)
                bossAnnihilationColors,// Наша Seq цепочка неоновых цветов
                1,                     // squareSize = 1 (размер 1х1 пиксель для максимальной детализации распада!)
                true,                  // spread = true (ТОТАЛЬНЫЙ РАДИАЛЬНЫЙ ВЗРЫВ ВО ВСЕ СТОРОНЫ)
                this.x, this.y,        // Центр взрыва (objX, objY)
                bossPixelConfig        // Конфиг без классов
            );

            // Вызываем строго по твоему списку аргументов:
            PixelDisintegrate(
                this.type.fullIcon,     // object
                this.x, this.y,         // x1, y1 (Центр босса)
                target.x, target.y,     // x2, y2 (Вектор удара / Не важно при spread = true)
                12,                     // width (Проигнорируется, так как spread = true)
                bossAnnihilationColors, // Seq цепочки Желтый->Лайм->Голубой
                1,                      // squareSize = 1 пиксель
                true                    // spread = true (Взрыв всего тела радиально!)
            );


            

            // Запоминаем размеры карты ДО удаления юнита из памяти
            let mapWidth = Vars.world.width();
            let mapHeight = Vars.world.height();

            // Воспроизводим начальные эффекты на месте юнита
            if(typeof endSequenceVFX !== 'undefined') endSequenceVFX.at(this.x, this.y);

            // Запускаем 15 волн взрывов, передавая сохраненные размеры карты
            for (let wave = 0; wave < 15; wave++) {
                Time.run(wave * 12, () => {
                    this.epicAnnihilationWave(wave, mapWidth, mapHeight);
                });
            }

            // ТОЛЬКО ТЕПЕРЬ легально убираем самого Оверлорда из памяти, 
            // не мешая таймерам Time.run делать свою работу
            this.super$remove();
        },

        epicAnnihilationWave(waveIndex, mapWidth, mapHeight) {
            let widthPx = mapWidth * 8;
            let heightPx = mapHeight * 8;

            // На каждой волне спавним по 5 случайных взрывов
            for (let i = 0; i < 3; i++) {
                let rx = Mathf.random(widthPx);
                let ry = Mathf.random(heightPx);

                // Визуальные эффекты
                if (typeof nukeExplosion !== 'undefined') nukeExplosion.at(rx, ry);
                if (typeof desNuke !== 'undefined') desNuke.at(rx, ry);
                if (typeof desNukeShockwave !== 'undefined') desNukeShockwave.at(rx, ry);
                Effect.shake(40, 60, rx, ry); 



                // НАНЕСЕНИЕ УРОНА: Проверяем, что мы ХОСТ или в СИНГЛЕ (Vars.net.client() == false)
                if (Vars.net.client() === false) {
                    
                    // 1. Урон юнитам в радиусе взрыва
                    Groups.unit.each(u => {
                        if (u != null && u.dst(rx, ry) <= 400) {
                            u.damage(999999); 
                            
                            
                        }
                    });

                    // 2. Уничтожение построек в радиусе взрыва
                    let tileRadius = Math.ceil(400 / 8);
                    let tileX = Math.floor(rx / 8);
                    let tileY = Math.floor(ry / 8);

                    for (let x = -tileRadius; x <= tileRadius; x++) {
                        for (let y = -tileRadius; y <= tileRadius; y++) {
                            if (x * x + y * y > tileRadius * tileRadius) continue;
                            
                            let tile = Vars.world.tile(tileX + x, tileY + y);
                            if (tile != null && tile.build != null) {
                                let bld = tile.build; // Кэшируем объект постройки

                                // Эффект распада запускаем ДО уничтожения здания, пока bld еще в памяти
                                if (typeof Disintegrate !== 'undefined' && Disintegrate != null) {
                                    // --- ВЫЗОВ ЯДЕРНОГО ИСПЕПЕЛЕНИЯ ДЛЯ ЗДАНИЯ (bld) ---

                                    // 1. Считаем линию разреза взрывной волны сквозь центр блока
                                    var blockSizeWorld = bld.block.size * 8 * Draw.scl; 
                                    var dirVec = new Vec2().trns(bld.rotation, blockSizeWorld / 2);

                                    var x1 = bld.x - dirVec.x;
                                    var y1 = bld.y - dirVec.y;
                                    var x2 = bld.x + dirVec.x;
                                    var y2 = bld.y + dirVec.y;

                                    // 2. Вызываем испепелятор в суровых ядерных тонах
                                    Disintegrate(
                                        bld.block.fullIcon,             // object (Текстура здания)
                                        x1, y1,                         // x1, y1
                                        x2, y2,                         // x2, y2
                                        10,                             // width (Толщина ядерного прожога шире — 10 пикселей)
                                        Color.valueOf("ffffff"),        // colorTo (Ослепительно белая плазма на исходе взрыва)
                                        Color.valueOf("ff5500"),        // sparkColor (Раскаленные докрасна брызги металла)
                                        Color.valueOf("333333")         // ashColor (Густая угольно-черная копоть и пепел)
                                    );


                                }

                                // Нативно взрываем здание
                                bld.kill(); 
                            }
                        }
                    }

                }
            }

            // Финал на последней волне
            if (waveIndex === 14) {
                let cx = widthPx / 2;
                let cy = heightPx / 2;

                if (typeof nukeScreenFlash !== 'undefined') nukeScreenFlash.at(cx, cy);
                Effect.shake(120, 250, cx, cy); 

                if (Vars.net.client() === false) {
                    // Уничтожаем все ядра на карте для вызова Game Over
                    Team.all.forEach(cons(team => {
                        let cores = team.cores();
                        for(let i = 0; i < cores.size; i++) {
                            let core = cores.get(i);
                            if(core != null) core.kill(); 
                        }
                    }));
                    
                    // Добиваем выживших юнитов
                    Groups.unit.each(u => {
                        if (u != null) {
                            if (Vars.net.active()) {
                                Call.unitDestroy(u.id);
                            } else {
                                u.remove();
                            }
                        }
                    });
                }
            }
        } 
    });
};



octoOverlord.weapons.clear();

const overEnergyField = new EnergyFieldAbility(Number.MAX_VALUE, 0, 40); 
const overBossStatus = new StatusFieldAbility(StatusEffects.boss, 600, 60, 240); // 240 is range

// Остальные параметры настраиваем после создания:
overEnergyField.status = Vars.content.getByName(ContentType.status, "mod-die")
overEnergyField.statusDuration = 6000;
overEnergyField.maxTargets = 1000;
overEnergyField.healPercent = 0;
overEnergyField.color = Color.valueOf("8f9aff");



// 2. Добавляем их в массив способностей юнита
octoOverlord.abilities.add(overBossStatus, overEnergyField);













const ultraLaserVFX = new Effect(60, e => {
    // 1. Основной яркий луч (вспышка)
    Draw.color(Color.white, Color.sky, e.fin());
    Lines.stroke(e.fout() * 8); // Толщина уменьшается со временем
    Lines.line(e.x, e.y, e.data.x, e.data.y);

    // 2. Частицы "энергии" вдоль луча
    Draw.color(Color.sky);
    Fill.circle(e.x, e.y, e.fout() * 4); // Искра в начале
    Fill.circle(e.data.x, e.data.y, e.fout() * 6); // Искра в конце

    // 3. Кольца вокруг точки попадания
    Draw.color(Color.white);
    Lines.stroke(e.fout() * 2);
    Lines.circle(e.data.x, e.data.y, e.fin() * 40);
    
    // 4. Разлетающиеся молнии/линии
    Angles.randLenVectors(e.id, 15, 20 + 40 * e.fin(), (x, y) => {
        Lines.lineAngle(e.data.x + x, e.data.y + y, Mathf.angle(x, y), e.fout() * 10);
    });
});






// 1. Ударная волна (Shockwave)
var desNukeShockwave = new Effect(190, e => {
    let size = e.rotation; // Используем rotation как радиус (например, 61)

    Draw.color(Color.white, Color.lightGray, e.fin());
    Draw.alpha(0.333 * e.fout());
    Lines.stroke((size / 15) + (size / 5) * e.fin());
    
    // Рисуем расширяющееся кольцо
    Lines.circle(e.x, e.y, size / 3 + size * Interp.pow2Out.apply(e.fin()) * 2);
});
desNukeShockwave.layer = Layer.groundUnit + 1;


// 2. Ядерный взрыв (Nuke Cloud & Sparks)
const desNuke = new Effect(80, e => {
    let size = e.rotation;
    let r = new Rand();
    r.setSeed(e.id);

    // --- Огненное облако (слои) ---
    let scl = 1.0;
    // Используем Tmp.c1 или Tmp.c2, чтобы гарантировать объект
    let c2 = Tmp.c2.set(Color.gray);
    c2.a = 0.8; // В Rhino лучше устанавливать поле напрямую или использовать c2.lerp(...)

    
    for(let k = 0; k < 6; k++){
        let cf = k / 5.0;
        Draw.color(c2, Pal.lightOrange, cf);
        
        for(let i = 0; i < 40; i++){
            let f = Mathf.curve(e.fin(), 0, 1 - r.random(0.2));
            let len = r.random(size * scl * 0.75) * Interp.pow5Out.apply(f) + r.random(size / 5);
            let ang = r.random(360);
            let psize = size / 5;
            let rad = r.random(psize * (scl * 0.5 + 0.5) * 0.87, psize) * scl * (1 - Interp.pow5In.apply(f));
            
            if(f < 1){
                let v = Tmp.v1.trns(ang, len).add(e.x, e.y);
                Fill.circle(v.x, v.y, rad);
            }
        }
        scl *= 0.75;
    }

    // --- Линии и Искры ---
    scl = 1.0;
    Draw.color(Pal.lighterOrange);
    Lines.stroke(3);
    for(let i = 0; i < 4; i++){
        for(let j = 0; j < 20; j++){
            let f = Mathf.curve(e.fin(), 0, 1 - r.random(0.2));
            let ang = r.random(360);
            let len = r.random(size * scl * 0.5) * Interp.pow5Out.apply(f) + r.random(size / 5);
            let line = r.random(22, 45) * Math.pow(scl, 1.1) * Interp.pow2Out.apply(Mathf.slope(Interp.pow5Out.apply(f)));

            if(f < 1){
                let v = Tmp.v1.trns(ang, len).add(e.x, e.y);
                Lines.lineAngle(v.x, v.y, ang, line);
            }
        }
        scl *= 1.4;
    }
});





const nukeExplosion = new Effect(180, 500, e => {
    let flashImg = Core.atlas.find("mod-flash");

    // 1. ВСПЫШКА (Существует только первые 45 тиков = 0.75 сек)
    if(e.time < 45){
        // Рассчитываем отдельный коэффициент исчезновения для вспышки (от 1 до 0 за 45 тиков)
        let fLife = 1 - (e.time / 45); 
        
        Draw.z(Layer.effect + 1);
        Draw.color(Color.white, Color.yellow, 1 - fLife);
        
        if(flashImg.found()){
            // Статичная большая звезда
            Draw.rect(flashImg, e.x, e.y, 240 * fLife, 240 * fLife);
            // Вращающаяся звезда
            Draw.rect(flashImg, e.x, e.y, 160 * fLife, 160 * fLife, e.time * 4);
        }
        Fill.circle(e.x, e.y, 80 * fLife);
    }

    // 2. ГУСТОЙ ДЫМ (Живет всё время эффекта)
    Draw.z(Layer.effect);
    for(let i = 0; i < 15; i++){
        Mathf.rand.setSeed(e.id + i);
        let angle = Mathf.random(360);
        let lenScl = Mathf.random(0.5, 1.2);
        let l = Interp.pow10Out.apply(e.fin()) * 160 * lenScl;
        let v = Tmp.v1.trns(angle, l).add(e.x, e.y);
        
        Draw.color(Color.darkGray, Color.gray, e.fin());
        Draw.alpha(0.8 * e.fout());
        Fill.circle(v.x, v.y, Interp.pow3Out.apply(e.fout()) * 50);
    }

    // 3. ИСКРЫ-ЗВЕЗДОЧКИ
    Draw.color(Color.yellow, Color.orange, e.fin());
    if(flashImg.found()){
        for(let i = 0; i < 12; i++){
            Mathf.rand.setSeed(e.id + i + 50);
            let l = Mathf.random(30, 220) * e.finpow();
            let a = Mathf.random(360);
            let v = Tmp.v2.trns(a, l).add(e.x, e.y);
            Draw.rect(flashImg, v.x, v.y, 12 * e.fout(), 12 * e.fout(), a + e.time);
        }
    }

    // 4. УДАРНАЯ ВОЛНА
    Draw.color(Color.white);
    Lines.stroke(4 * e.fout());
    Lines.circle(e.x, e.y, e.fin(Interp.pow5Out) * 220);

    // 5. ПЯТНО ГАРИ НА ПОЛУ
    Draw.z(Layer.floor);
    Draw.color(Color.black);
    Draw.alpha(0.5 * e.fout());
    Fill.circle(e.x, e.y, 130 * e.fout());
});




const nukeScreenFlash = new Effect(100, e => {
    // Делаем вспышку на весь экран
    Draw.color(Color.white);
    // Прозрачность падает от 0.8 до 0
    Draw.alpha(0.8 * e.fout(Interp.pow3Out));
    // Рисуем огромный квадрат, который точно перекроет экран игрока
    Fill.rect(e.x, e.y, Vars.world.width() * Vars.tilesize, Vars.world.height() * Vars.tilesize);
});

const desNukeVaporize = new Effect(40, 1200, e => {
    let size = (e.data != null) ? e.data : 10;
    let r = new Rand();
    r.setSeed(e.id);
    
    let count = 20 + Math.floor(size * size * 0.5);
    let c = 0.25;

    for(let i = 0; i < count; i++){
        let l = r.nextFloat() * c;
        let curveEnd = ((1 - c) + l) * r.random(0.8, 1);
        let f = Mathf.curve(e.fin(), l, curveEnd);
        
        let len = r.random(0.5, 1) * (80 + size * 10) * Interp.pow2In.apply(f);
        let off = Math.sqrt(r.nextFloat()) * size;
        let ang = r.random(360);
        let rng = r.range(10);
        
        let scl = (size / 2) * r.random(0.9, 1.1) * Mathf.slope(f);

        if(f > 0 && f < 1){
            Tmp.v1.trns(ang, off).add(e.x, e.y).add(Tmp.v2.trns(e.rotation + rng, len));
            Draw.color(Pal.lightOrange, Pal.rubble, Interp.pow3Out.apply(f));
            Fill.circle(Tmp.v1.x, Tmp.v1.y, scl);
        }
    }
});

// ПРАВИЛЬНОЕ ПРИСВОЕНИЕ СЛОЯ:
desNukeVaporize.layer = Layer.flyingUnit;


const nukeWeapon = extend(Weapon, "mega-nuke", {
    reload: 1280,
    mirror: false,
    x: 0,
    y: 0,
    shootSound: Sounds.none,

    bullet: extend(BasicBulletType, {
        speed: 5,
        lifetime: 80,
        width: 25,
        height: 40,
        sprite: "missile-large", 
        
        damage: 500000, 
        splashDamage: 500000,
        splashDamageRadius: 160, 
        trailLength: 5,
        trailWidth: 5,
        scaleLife: true,
        
        hitEffect: desNuke, 
        despawnEffect: desNuke,
        despawnHit: true,
        collidesTiles: false,

        hit(b) {
            if (!b) return;

            const radiusTiles = 35;
            const radiusWorld = radiusTiles * 8; 
            const staticRadius = 12;
            const centerX = World.toTile(b.x);
            const centerY = World.toTile(b.y);

            // --- КЛИЕНТСКАЯ И ОБЩАЯ ЛОГИКА (Эффекты и Графика) ---
            // Эффекты взрыва и праха должны создаваться локально у каждого игрока
            for(let x = -radiusTiles; x <= radiusTiles; x += 2){
                for(let y = -radiusTiles; y <= radiusTiles; y += 2){
                    let dist = Mathf.len(x, y);
                    if(dist > radiusTiles) continue;
                    
                    let tx = centerX + x;
                    let ty = centerY + y;
                    if(tx < 0 || ty < 0 || tx >= Vars.world.width() || ty >= Vars.world.height()) continue;
                    
                    let tile = Vars.world.tile(tx, ty);
                    if(tile == null) continue;

                    let build = tile.build; 
                    let targetBlock = tile.block();

                    if(!targetBlock.isAir()){
                        var isStatic = targetBlock instanceof StaticWall || targetBlock.alwaysReplace;
                        
                        if(!isStatic && build != null){
                            var bDist = Mathf.dst(tx, ty, centerX, centerY);
                            if(bDist < radiusTiles * 0.3){
                                // ЗОНА 1: Эпицентр — моментальное испарение здания в плазму
                                desNukeVaporize.at(build.x, build.y, 0, targetBlock.size * 8);
                            } else {
                                // ЗОНА 2: Окраина взрыва — здание разносит ударной волной в уголь и пепел!
                                
                                // Расчитываем направление вектора ударной волны из центра ядерного взрыва сквозь здание
                                var angleFromEpicenter = Mathf.angle(build.x - centerX * 8, build.y - centerY * 8);
                                var blockSizeWorld = targetBlock.size * 8 * Draw.scl;
                                
                                // Линия разреза пойдет перпендикулярно ударной волне (как будто фронт волны сносит блок)
                                var waveVec = new Vec2().trns(angleFromEpicenter + 90, blockSizeWorld / 2);
                                
                                var x1 = build.x - waveVec.x;
                                var y1 = build.y - waveVec.y;
                                var x2 = build.x + waveVec.x;
                                var y2 = build.y + waveVec.y;

                                // Вызываем наш оптимизированный испепелятор в брутальных ядерных тонах
                                Disintegrate(
                                    targetBlock.fullIcon,           // object (Текстура здания)
                                    x1, y1,                         // x1, y1
                                    x2, y2,                         // x2, y2
                                    12,                             // width (Толщина ядерного прожога — 12 пикселей)
                                    Color.valueOf("ffffff"),        // colorTo (Ослепительно белая плазма)
                                    Color.valueOf("ff5500"),        // sparkColor (Раскаленные докрасна брызги металла)
                                    Color.valueOf("333333")         // ashColor (Густая угольно-черная копоть и сажа)
                                );
                            }
                        }
                    }

                }
            }

            // Графические эффекты для юнитов у всех игроков
            Units.nearby(null, b.x, b.y, radiusWorld, cons(function(u) {
                var uDist = u.dst(b.x, b.y);
                if(uDist < radiusWorld * 0.3) {
                    // ЗОНА 1: Эпицентр — моментальное испарение юнита в плазму
                    desNukeVaporize.at(u.x, u.y, u.rotation, u.hitSize);
                } else {
                    // ЗОНА 2: Окраина — юнита сносит взрывной волной, испепеляя в уголь и сажу
                    
                    // Направление взрывной волны от центра ядерки (b.x, b.y) сквозь юнита
                    var angleFromEpicenter = Mathf.angle(u.x - b.x, u.y - b.y);
                    var unitSizeWorld = u.hitSize * Draw.scl;
                    
                    // Линия разреза идет перпендикулярно фронту взрывной волны
                    var waveVec = new Vec2().trns(angleFromEpicenter + 90, unitSizeWorld / 2);
                    
                    var x1 = u.x - waveVec.x;
                    var y1 = u.y - waveVec.y;
                    var x2 = u.x + waveVec.x;
                    var y2 = u.y + waveVec.y;

                    // Вызываем наш оптимизированный испепелятор в суровых ядерных тонах
                    Disintegrate(
                        u.type.fullIcon,                // object (Текстура юнита)
                        x1, y1,                         // x1, y1
                        x2, y2,                         // x2, y2
                        8,                              // width (Толщина прожога для юнита — 8 пикселей)
                        Color.valueOf("ffffff"),        // colorTo (Ослепительно белая плазма)
                        Color.valueOf("ff5500"),        // sparkColor (Раскаленные докрасна брызги металла)
                        Color.valueOf("333333")         // ashColor (Густая угольно-черная копоть и сажа)
                    );
                }
            }));


            // Глобальные спецэффекты взрыва
            desNuke.at(b.x, b.y);
            nukeExplosion.at(b.x, b.y);
            desNukeShockwave.at(b.x, b.y);
            Effect.shake(30, 200, b.x, b.y);

            // --- СЕРВЕРНАЯ ИГРОВАЯ ЛОГИКА (Урон и Модификация карты) ---
            // Этот блок кода выполняет ТОЛЬКО хост, исключая десинхронизацию и краши
            if(!Vars.net.client()) {
                
                // 1. Уничтожение построек и природного ландшафта
                for(let x = -radiusTiles; x <= radiusTiles; x += 2){
                    for(let y = -radiusTiles; y <= radiusTiles; y += 2){
                        let dist = Mathf.len(x, y);
                        if(dist > radiusTiles) continue;
                        
                        let tx = centerX + x;
                        let ty = centerY + y;
                        if(tx < 0 || ty < 0 || tx >= Vars.world.width() || ty >= Vars.world.height()) continue;
                        
                        let tile = Vars.world.tile(tx, ty);
                        if(tile == null) continue;

                        let targetBlock = tile.block();

                        if(!targetBlock.isAir()){
                            let isStatic = targetBlock instanceof StaticWall || targetBlock.alwaysReplace;
                            
                            // Для обычных зданий вызываем легальный метод .kill() 
                            // Сервер сам безопасно очистит карту и уведомит клиентов
                            if(!isStatic && tile.build != null){
                                tile.build.kill();
                            } 
                            // Для природных камней/стен используем нативную очистку тайлов сервером
                            else if(isStatic && dist <= staticRadius){
                                for(let ox = 0; ox < 2; ox++){
                                    for(let oy = 0; oy < 2; oy++){
                                        let t = Vars.world.tile(tx + ox, ty + oy);
                                        if(t) t.setAir();
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Нанесение физического урона юнитам и отталкивание
                Units.nearby(null, b.x, b.y, radiusWorld, cons(u => {
                    let uDist = u.dst(b.x, b.y);
                    let trns = Tmp.v1.set(u.x - b.x, u.y - b.y).setLength(20 * (1 - uDist / radiusWorld));
                    u.vel.add(trns.x, trns.y);

                    // Наносим урон через сервер
                    u.damage(500000);
                }));
            }
        }
    })
});


const sliceVert = "attribute vec4 a_position;\nattribute vec2 a_texCoord;\nvarying vec2 v_texCoords;\nvoid main(){\n    v_texCoords = a_texCoord;\n    gl_Position = a_position;\n}";

const sliceFrag = "#define HIGHP\nvarying vec2 v_texCoords;\nuniform sampler2D u_texture;\nuniform float u_angle;\nuniform float u_side;\nvoid main(){\n    vec2 pos = v_texCoords - vec2(0.5);\n    float angleRad = radians(u_angle);\n    float d = (pos.x * cos(angleRad) + pos.y * sin(angleRad));\n    if(d * u_side > 0.0) discard;\n    gl_FragColor = texture2D(u_texture, v_texCoords);\n}";

const sliceShader = new Shader(sliceVert, sliceFrag);



const slashCutEffect = new Effect(60, e => {
    if (!(e.data instanceof Unit)) return;
    let unit = e.data;
    let region = unit.type.fullIcon;

    let fin = e.fin(Interp.pow3Out);
    let move = fin * 30;
    let angle = e.rotation;
    let glow = Mathf.sin(fin * Mathf.PI);

    [1, -1].forEach(side => {
        Draw.shader(sliceShader);
        sliceShader.setUniformf("u_angle", angle);
        sliceShader.setUniformf("u_side", side);
        sliceShader.setUniformf("u_glow", glow);

        let tx = e.x + Angles.trnsx(angle + 90, move * side);
        let ty = e.y + Angles.trnsy(angle + 90, move * side);

        Draw.color(Color.white);
        Draw.alpha(e.fout() * 1.2);
        Draw.rect(region, tx, ty, unit.rotation - 90);
        Draw.shader();
    });

    Draw.color(Color.valueOf("ffaa00"));
    Draw.alpha(e.fout());
    Angles.randLenVectors(e.id, 12, 6 + fin * 16, (x, y) => {
        let ax = x * 0.8;
        let ay = y * 0.8 + e.fin() * -8;
        Lines.line(e.x + ax, e.y + ay, e.x + ax * 1.2, e.y + ay - 3, 0.8);
    });

    Draw.reset();
});


const swordBullet = extend(BasicBulletType, {
    // Параметры пули
    speed: 10,
    damage: 999999,
    lifetime: 60,
    pierce: true,
    pierceCap: 1,
    removeAfterPierce: true,

    // Метод, который срабатывает при попадании в юнит
    hit(b, x, y) {
        this.super$hit(b, x, y); // Вызываем базовое поведение (урон)

        // Ищем ближайшего юнита в точке попадания
        let unit = Units.closestEnemy(b.team, x, y, 10, u => u.checkTarget(true, true));

        if (unit != null) {
            // Если у юнита мало ХП (он умрет от этого удара или уже при смерти)
            if (unit.health <= b.damage || unit.dead) {
                
                // Спавним наш кастомный VFX
                // Передаем регион текстуры юнита в data для эффекта распада
                slashCutEffect.at(unit.x, unit.y, unit.rotation, unit.type.region);

                // Если нужно мгновенное удаление без стандартного взрыва юнита:
                unit.remove(); 
            }
        }
    }
});



const katanaWeapon = extend(Weapon, "sharp-katana", {
    reload: 40,
    shootSound: Sounds.none,
    
    bullet: swordBullet
});




const glitchRemoveEffect = new Effect(60, e => {
    let size = e.rotation > 0 ? e.rotation : 8;
    let fin = e.fin();
    let fout = e.fout();

    // --- БЕЗОПАСНАЯ ОТРИСОВКА ТЕКСТА ---
    let font = Fonts.outline;
    let data = font.getData();
    
    // 1. Сохраняем старые масштабы (X и Y на случай, если они разные)
    let oldScaleX = data.scaleX;
    let oldScaleY = data.scaleY;

    // 2. Устанавливаем новый масштаб, зависящий от размера юнита
    let dynamicScale = 0.2 + (size / 120); 
    data.setScale(dynamicScale);

    // 3. Рисуем текст
    Draw.color(Color.magenta);
    Draw.alpha(fout);
    font.draw("entity.remove()", e.x, e.y + size + (fin * size * 0.5), Align.center);

    // 4. ОБЯЗАТЕЛЬНО возвращаем как было
    data.setScale(oldScaleX, oldScaleY);
    // ----------------------------------

    // Остальной глитч-визуал (квадраты и линии)
    Draw.color(Color.purple, Color.magenta, fin);
    Lines.stroke(fout * (1 + size / 16));
    Lines.line(e.x, e.y + size + (fin * size * 0.5) - 2, e.x, e.y);

    Angles.randLenVectors(e.id, 8 + (size / 4), size * 1.5 * fin, (vx, vy) => {
        Fill.square(e.x + vx, e.y + vy, fout * (size / 6 + 1));
    });
});



const singularityWeapon = extend(Weapon, "void-eraser", {
    reload: 400,
    mirror: false,
    x: 0, y: 0,
    shootSound: Sounds.none,
    
    bullet: extend(BasicBulletType, {
        damage: 0,
        lifetime: 180,
        speed: 1.5,
        width: 12, height: 12,
        shrinkX: 0, shrinkY: 0,
        frontColor: Color.black,
        backColor: Color.purple,
        
        update(b) {
            // Визуал дыры (пульсация)
            Draw.color(Color.black, Color.purple, Mathf.absin(Time.time, 5, 1));
            Fill.circle(b.x, b.y, 8 + Mathf.random(2));
            
            // Логика засасывания
            Groups.unit.each(u => {
                if(u.team != b.team && u.dst(b.x, b.y) < 140) {
                    // Тянем к центру пули
                    u.impulse(Tmp.v1.set(b.x, b.y).sub(u.x, u.y).limit(2.5));
                    
                    // Если затянуло в центр — активируем "удаление"
                    if(u.dst(b.x, b.y) < 15) {
                        if(!u.dead) {
                            glitchRemoveEffect.at(u.x, u.y, u.hitSize);
                            u.remove(); // Юнит просто исчезает из игры
                        }
                    }
                }
            });
            

        },
        
        // При детонации дыра удаляет и постройки
        despawn(b) {
            this.super$despawn(b);
            Damage.tileDamage(b.team, b.x, b.y, 40, 999999);
            Vars.world.tileWorld(b.x, b.y);
            // Удаляем постройки в эпицентре через remove
            for(let x = -2; x <= 2; x++) {
                for(let y = -2; y <= 2; y++) {
                    let build = Vars.world.buildWorld(b.x + x*8, b.y + y*8);
                    if(build) build.remove();
                }
            }
        }
    })
});








const fragmentEffect = new Effect(80, e => {
    if (!(e.data instanceof TextureRegion)) return;
    
    let region = e.data;
    let cols = 3; // На сколько частей режем по горизонтали
    let rows = 3; // На сколько частей режем по вертикали
    
    let w = region.width / cols;
    let h = region.height / rows;

    for(let x = 0; x < cols; x++){
        for(let y = 0; y < rows; y++){
            // Рассчитываем случайный разлет для каждого кусочка
            let rand = new Rand(e.id + (x * rows + y));
            let dir = rand.random(360);
            let dist = e.fin(Interp.pow3Out) * rand.random(40, 80);
            
            // Смещение кусочка
            let tx = e.x + Angles.trnsx(dir, dist);
            let ty = e.y + Angles.trnsy(dir, dist);
            
            // Отрисовка части текстуры (имитация нарезки)
            Draw.color(Color.white);
            Draw.alpha(e.fout());
            
            // Вырезаем кусок из общего атласа
            // (В JS Mindustry мы рисуем тот же спрайт, но уменьшенный и повернутый)
            Draw.rect(region, tx, ty, w * e.fout(), h * e.fout(), e.rotation + rand.random(-100, 100));
        }
    }
    
    // Добавляем немного стандартного мусора (Scrap)
    Draw.color(Color.gray);
    Angles.randLenVectors(e.id, 10, 20 + 40 * e.fin(), (vx, vy) => {
        Fill.square(e.x + vx, e.y + vy, e.fout() * 2);
    });
});




const binaryDisintegrate = new Effect(60, e => {
    // e.rotation здесь будет выступать как радиус/размер юнита (hitSize)
    let size = e.rotation > 0 ? e.rotation : 10; // Если не задано, ставим 10 (размер танка)
    let amount = 8 + (size / 3); // Чем больше юнит, тем больше цифр
    let spread = size * 1.5;     // Радиус разлета зависит от размера

    Draw.color(Color.green, Color.lime, e.fin());

    for(let i = 0; i < amount; i++){
        let rand = new Rand(e.id + i);
        let char = rand.chance(0.5) ? "1" : "0";
        
        // Скорость разлета и подъема зависит от размера
        let lifetime = e.finpow(); 
        let x = e.x + rand.range(spread) * lifetime;
        let y = e.y + (rand.range(spread) + (size * 0.8)) * lifetime;

        // Масштаб цифр тоже слегка скалируется от размера юнита
        let fontSize = 0.2 + (size / 100); 
        
        let oldScale = Fonts.outline.getData().scaleX;
        Fonts.outline.getData().setScale(fontSize);
        
        // Делаем цифры мерцающими и затухающими
        Draw.alpha(e.fout() * (0.5 + rand.random(0.5)));
        Fonts.outline.draw(char, x, y, Align.center);
        
        Fonts.outline.getData().setScale(oldScale);
    }

    // Зеленые "цифровые" частицы (тоже зависят от размера)
    Angles.randLenVectors(e.id, 5 + (size / 4), spread * e.finpow(), (vx, vy) => {
        Draw.color(Color.lime);
        Fill.square(e.x + vx, e.y + vy, e.fout() * (size / 8 + 1));
    });
});



const matrixVirus = extend(Weapon, "binary-virus", {
    reload: 10, 
    alternate: true,
    shootSound: Sounds.none,
    x: 4, 
    
    bullet: extend(BasicBulletType, {
        damage: 1000000, 
        speed: 6,
        lifetime: 50,
        
        width: 4,
        height: 4,
        shrinkX: 0,
        shrinkY: 0,
        frontColor: Color.white,
        backColor: Color.lime,
        trailColor: Color.green,
        trailWidth: 1.5,
        trailLength: 5,

        hitEffect: binaryDisintegrate,
        despawnEffect: Fx.none,
        collidesTiles: true, 

        hitEntity(b, entity) {
            if (entity instanceof Unit) {
                // Эффекты создаются локально на каждом клиенте
                binaryDisintegrate.at(entity.x, entity.y, entity.hitSize);
                glitchRemoveEffect.at(entity.x, entity.y, entity.hitSize);
                
                // ЛОГИКА УДАЛЕНИЯ (Только для хоста/сервера)
                if (!Vars.net.client()) {
                    // Call.unitDestroy отправляет сетевой пакет. 
                    // Клиенты получают этот пакет и БЕЗОПАСНО вызывают .remove() у себя в движке.
                    Call.unitDestroy(entity.id); 
                }
            }
        },
        
        hitTile(b, tile) {
            if (tile.build != null) {
                let bld = tile.build;
                let bSize = bld.block.size * 8;

                // Эффект видят все
                binaryDisintegrate.at(b.x, b.y, bSize);

                // ЛОГИКА УДАЛЕНИЯ (Только для хоста/сервера)
                if (!Vars.net.client()) {
                    // Превращаем тайл в воздух на сервере. 
                    // Сервер сам разошлет пакет Call.tileDestroy под капотом, 
                    // очищая постройку методом .remove() на всех клиентах одновременно.
                    bld.tile.setAir(); 
                }
            }
        }
    })
});



const creatorSpawnVFX = new Effect(180, e => {
    // 1. Огромная белая вспышка на весь экран (как мы делали)
    Draw.color(Color.white);
    Draw.alpha(e.fout(Interp.pow5Out));
    Fill.rect(e.x, e.y, Vars.world.width() * 8, Vars.world.height() * 8);

    // 2. Схлопывающееся кольцо (сбор данных)
    Draw.color(Color.lime, Color.green, e.fin());
    Lines.stroke(e.fout() * 5);
    Lines.circle(e.x, e.y, e.fout() * 200);

    // 3. Бинарный дождь вокруг точки спавна
    for(let i = 0; i < 20; i++){
        let rand = new Rand(e.id + i);
        let char = rand.chance(0.5) ? "1" : "0";
        // Add 'let' or 'const' at the beginning
        let life = (e.time + Mathf.random(60)) % 60 / 60;

        
        // Устанавливаем цвет текста
        Draw.color(Color.lime);
        // Устанавливаем масштаб (0.3)
        Fonts.def.getData().setScale(0.3);

        // Рисуем
        Fonts.def.draw(char, 
            e.x + rand.range(50), 
            e.y + 60 - (e.fout() * 120), // Используем e.fout() вместо life, если life это прогресс эффекта
            Align.center
        );

        // Сбрасываем масштаб обратно (важно, чтобы не сломать остальной интерфейс!)
        Fonts.def.getData().setScale(1.0);
        Draw.reset();
    }

    // 4. Тряска экрана, нарастающая к моменту появления
    Effect.shake(e.fin() * 10, e.fin() * 10, e.x, e.y);

    // 5. Глитч-квадраты в центре
    Angles.randLenVectors(e.id, 30, e.fin() * 100, (x, y) => {
        Fill.square(e.x + x, e.y + y, e.fout() * 6);
    });
});










const galacticStarVFX = new Effect(60, e => {
    // Ядро падающей звезды
    Draw.color(Color.white, Pal.lightOrange, e.fin());
    Fill.circle(e.x, e.y, e.fout() * 5);
    
    // Хвост (след)
    Draw.color(Pal.lightOrange);
    Lines.stroke(e.fout() * 2);
    Lines.lineAngle(e.x, e.y, e.rotation, e.fout() * 20);
});

const galacticExplosion = new Effect(80, e => {
    // Вспышка в форме креста или звезды
    Draw.color(Color.white, Color.purple, e.fin());
    for(let i = 0; i < 4; i++){
        Draw.rect(Tex.whiteui, e.x, e.y, 4, 40 * e.fout(), i * 90);
    }
    // Кольцо расширения
    Lines.stroke(e.fout() * 3);
    Lines.circle(e.x, e.y, e.fin() * 60);
    
    // Тряска
    Effect.shake(4, 4, e.x, e.y);
});















const galacticFall = extend(Weapon, "galactic-fall", {
    reload: 450, 
    mirror: false,
    x: 0, y: 0,
    shootSound: Sounds.none,

    bullet: extend(BasicBulletType, {
        damage: 0, 
        lifetime: 10,
        speed: 0.1,
        despawnEffect: Fx.none,
        hitEffect: Fx.none,

        // Метод срабатывает ОДИН РАЗ при выстреле орудия
        init(b) {
            if (!b) return;
            this.super$init(b);

            // Запускаем цикл падения звезд (всего, например, 10 волн в течение короткого времени)
            // Вместо засорения update, мы планируем шаги через фиксированные промежутки тиков
            for (let step = 0; step < 4; step++) {
                // Каждый шаг сдвигается по времени на 4 тика
                Time.run(step * 4, () => {
                    
                    // Спавним по 3 звезды за один шаг
                    for (let i = 0; i < 3; i++) {
                        let rx = b.x + Mathf.range(250);
                        let ry = b.y + Mathf.range(250);
                        
                        // Случайная задержка падения конкретной звезды (от 0 до 40 тиков)
                        let delay = Mathf.random(40);

                        // 1. ВИЗУАЛ ДЛЯ ВСЕХ (Запускается и у хоста, и у клиентов)
                        Time.run(delay, () => {
                            galacticStarVFX.at(rx, ry, -90);
                            
                            // Звуки воспроизводятся только там, где есть аудиосистема (не крашит headless-сервер)
                        });

                        // 2. УДАР И УРОН (Только на сервере!)
                        // Считаем задержку падения + 15 тиков на сам полет
                        Time.run(delay + 15, () => {
                            
                            // Эффект взрыва показываем всем игрокам
                            galacticExplosion.at(rx, ry);
                            // Сюда можно вставить твой эффект бинарного испарения:

                            // Расчет урона выполняет ИСКЛЮЧИТЕЛЬНО сервер
                            if (!Vars.net.client()) {
                                Damage.damage(b.team, rx, ry, 50, 500000);
                            }
                        });
                    }
                });
            }
        }
    })
});


const endSequenceVFX = new Effect(300, e => {
    let rand = new Rand(e.id);

    let fin = e.fin();
    let fout = e.fout();

    // 1. СИНЯЯ СФЕРА (Ограничена максимум 5 блоками)
    let invFin = 1 - fin;
    let interpPow3Out = 1 - (invFin * invFin * invFin);

    // 5 блоков * 8 пикселей = 40 пикселей в диаметре (радиус 20 пикселей)
    let maxSphereSize = 20; 
    let currentRadius = interpPow3Out * maxSphereSize;

    // Слой А: Полупрозрачная внешняя синяя аура
    Draw.color(Color.sky);
    Draw.alpha(fout * 0.4); 
    let pulse = Math.sin(e.time * 0.2) * 2; // Уменьшил пульсацию под новый размер
    Fill.circle(e.x, e.y, currentRadius + pulse);

    // Слой Б: Плотное внутреннее синее ядро
    Draw.color(Color.blue);
    Draw.alpha(fout * 0.8);
    Fill.circle(e.x, e.y, currentRadius * 0.75);


    // 2. ПОГЛОЩЕНИЕ ЧАСТИЦ (Теперь они не исчезают, а липнут к сфере)
    Draw.color(Color.white);
    
    // Мягкое угасание только под самый конец эффекта (последние 10% времени)
    let particleAlpha = fin > 0.9 ? (1 - fin) * 10 : 1;
    Draw.alpha(particleAlpha);

    for(let i = 0; i < 150; i++){
        let angle = rand.random(360);
        
        // Начальная дистанция спавна частиц (от 150 до 350 пикселей от центра)
        let startDist = 150 + rand.random(200); 
        
        // Нелинейный полет внутрь (сначала быстро, потом тормозят у сферы)
        let t = fin * fin * fin; // pow3 интерполяция
        
        // Магия: частица летит не в 0, а останавливается ровно на текущем радиусе сферы!
        let distance = startDist * (1 - t) + currentRadius * t;
        
        // Размер частиц уменьшается плавно, они не пропадают резко
        let size = 1 + (fout * 2.5);
        
        let px = e.x + Angles.trnsx(angle, distance);
        let py = e.y + Angles.trnsy(angle, distance);
        
        Fill.circle(px, py, size);
    }


    // 3. Белый экран (Нарастает перед взрывом)
    if(fin > 0.8){
        Draw.color(Color.white);
        Draw.alpha((fin - 0.8) * 5);
        Fill.rect(e.x, e.y, Vars.world.width() * 8, Vars.world.height() * 8);
    }


    // 4. Тряска экрана (Нарастает к финалу)
    Effect.shake(fin * 15, fin * 15, e.x, e.y);

    // Сброс цвета
    Draw.color(Color.white);
});


const puniaNukeHit = new Effect(40, e => {
    Draw.color(Color.valueOf("ffbe45"), Color.valueOf("ff5500"), e.fin());
    
    Lines.stroke(4 * e.fout());
    Lines.circle(e.x, e.y, 10 + e.fin() * 70);
    
    // ЧИСТЫЙ JS ЦИКЛ ВМЕСТО КАПРИЗНОГО Angles.randLenVectors
    let rand = new Rand(e.id);          // Синхронизируем рандом разлета для всех
    let count = 15;                     // Количество искр
    let maxLen = 10 + e.fin() * 90;     // Дистанция разлета

    for(let i = 0; i < count; i++) {
        let angle = rand.random(360);      // Случайный угол в градусах
        let len = rand.random(10, maxLen); // Случайное расстояние
        
        // Считаем точные координаты смещения искры (вручную через тригонометрию Arc)
        let x = Angles.trnsx(angle, len);
        let y = Angles.trnsy(angle, len);

        Lines.stroke(3 * e.fout());
        // Рисуем линии искр от центра (e.x, e.y) со смещением
        Lines.line(e.x + x * 0.5, e.y + y * 0.5, e.x + x, e.y + y);
    }
    
    Draw.color(Color.white);
    Fill.circle(e.x, e.y, 25 * e.fout());
});


const missileSwarm = extend(Weapon, "missile-swarm", {
    reload: 300,
    mirror: false,
    x: 0,
    y: 0,
    shootSound: Sounds.none,
    shootCone: 360,
    shoot: extend(ShootSpread, {
        shots: 8,
        spread: 45
    }), 
    bullet: extend(MissileBulletType, {
        speed: 7,
        lifetime: 120,
        damage: 9999,
        splashDamage: 9999,
        splashDamageRadius: 80,
        homingPower: 0.2,
        homingRange: 300,
        trailColor: Color.valueOf("ffbe45"),
        hitEffect: puniaNukeHit,
        despawnEffect: puniaNukeHit,
        despawnHit: true,

        hit(b) {
            // Эффект взрыва создаем для всех игроков (визуальная часть)
            puniaNukeHit.at(b.x, b.y);
            
            // --- ЭФФЕКТЫ ДЛЯ КЛИЕНТОВ И СЕРВЕРА (Графика) ---
           Units.nearbyEnemies(b.team, b.x - 40, b.y - 40, 80, 80, cons(function(u) {
                if (u.dst(b.x, b.y) <= 40) {
                    // Если у юнита от урона не останется здоровья — кромсаем его на куски обшивки!
                    if (u.health - (u.maxHealth * 0.15) <= 0) {
                        
                        // 1. Создаем Seq реалистичных цветов для обугливания металла
                        var fragMeltColors = new Seq();
                        fragMeltColors.add(Color.gray);   // Серый цвет стали/титана
                        fragMeltColors.add(Color.darkGray); // Окисление и нагар
                        fragMeltColors.add(Color.black);  // Обугленный кусок обшивки

                        // 2. Шаблон настроек FragEntity под Rhino JS (без классов, на прототипах)
                        var unitDebrisTemplate = new FragEntity(
                            u.x, u.y, 
                            0, 0, 
                            0.04,              // drag (трение воздуха, куски плавно тормозят)
                            160,               // lifetime (время жизни обломков в тиках)
                            smokeBurst,        // trailEffect (твой кастомный густой дым)
                            Fx.pulverize,      // explosionEffect (пыль и крошка при деспавне куска)
                            150,               // damage (осколки наносят 150 ед. урона врагам на своем пути!)
                            false,             // incend = false (без огня, только чистая кинетика)
                            Color.darkGray,    // sparkColor (темно-серый дым на вылете)
                            Color.black,       // ashColor (черная копоть на исходе жизни)
                            fragMeltColors,    // Цепочка постепенного почернения металла
                            14,                // spin (вращение осколков металла в воздухе)
                            null, null, null,  // Runnables (оставляем стандартные)
                            u.type.fullIcon    // Спрайт-заглушка
                        );

                        // 3. Высчитываем вектор направленного импульса взрыва по ротации пули (b.rotation)
                        var strikeVelX = Math.cos(b.rotation * Mathf.degRad) * 90;
                        var strikeVelY = Math.sin(b.rotation * Mathf.degRad) * 90;

                        // 4. Вызываем твой метод Fragment
                        Fragment(
                            u.type.fullIcon,   // Спрайт уничтожаемого юнита
                            strikeVelX, strikeVelY, // Направленная скорость отлета кусков
                            60,                // cone (разлет осколков веером в пределах 60 градусов)
                            unitDebrisTemplate // Наш подготовленный конфиг
                        );

                    }
                }
            }));


            // --- СЕРВЕРНАЯ ИГРОВАЯ ЛОГИКА (Урон и калькуляции) ---
            // Изменение характеристик и здоровья разрешено ТОЛЬКО хосту
            if(!Vars.net.client()) {
                
                // 1. Урон по вражеским юнитам процентный + срез брони
                Units.nearbyEnemies(b.team, b.x - 40, b.y - 40, 80, 80, cons(u => {
                    if (u.dst(b.x, b.y) <= 40) {
                        u.armor = Math.max(0, u.armor * 0.25);
                        // Вызываем серверный метод нанесения процентного урона
                        u.damage(u.maxHealth * 0.15); 
                    }
                }));

                // 2. Урон по постройкам через чистый JS-цикл (Замена баганого Geometry)
                let tileX = Math.floor(b.x / 8);
                let tileY = Math.floor(b.y / 8);
                let tileRadius = Math.ceil(40 / 8); // 5 тайлов

                // Использованный ранее HashSet заменен на простой массив для исключения дубликатов построек
                let damagedBuilds = [];

                for (let x = -tileRadius; x <= tileRadius; x++) {
                    for (let y = -tileRadius; y <= tileRadius; y++) {
                        // Проверка попадания тайла в радиус окружности
                        if (x * x + y * y > tileRadius * tileRadius) continue;

                        let currentTile = Vars.world.tile(tileX + x, tileY + y);
                        if (currentTile == null || currentTile.build == null) continue;

                        let bld = currentTile.build;

                        // Проверяем команду и дистанцию в пикселях
                        if (bld.team != b.team && bld.dst(b.x, b.y) <= 40) {
                            
                            // Защита от повторного нанесения урона одной мультиблочной постройке
                            if (damagedBuilds.indexOf(bld.id) === -1) {
                                damagedBuilds.push(bld.id);

                                // Проверяем потенциальную смерть здания ради эффекта
                                if (bld.health - (bld.maxHealth * 0.15) <= 0) {
                                    
                                    // 1. Создаем Seq реалистичных цветов для обугливания обломков здания через Color.valueOf()
                                    var buildingMeltColors = new Seq();
                                    buildingMeltColors.add(Color.valueOf("808080")); // Серый цвет бетона/металла постройки
                                    buildingMeltColors.add(Color.valueOf("a9a9a9")); // Нагар и копоть на кусках стен
                                    buildingMeltColors.add(Color.valueOf("000000")); // Обугленные куски конструкции

                                    // 2. Шаблон настроек FragEntity под Rhino JS (на прототипах, без ключевого слова class)
                                    // Задаем координаты bld.x, bld.y, чтобы куски здания вылетали из центра постройки
                                    var buildingDebrisTemplate = new FragEntity(
                                        bld.x, bld.y, 
                                        0, 0, 
                                        0.05,               // drag (куски стен тяжелые, тормозят в воздухе быстрее)
                                        180,                // lifetime (живут дольше — до 3 секунд)
                                        smokeBurst,         // trailEffect (твой кастомный густой дым)
                                        Fx.pulverize,       // explosionEffect (каменная крошка и пыль при деспавне куска)
                                        300,                // damage (тяжелые куски стен наносят по 300 ед. урона врагам при падении!)
                                        false,              // incend = false (чистая кинетика разрушения постройки)
                                        Color.valueOf("a9a9a9"),     // sparkColor (темно-серый дым шлейфа на вылете)
                                        Color.valueOf("000000"),     // ashColor (черная сажа в конце полета)
                                        buildingMeltColors, // Цепочка постепенного почернения обломков
                                        10,                 // spin (обломки стен крутятся медленнее и тяжелее)
                                        null, null, null,   // Runnables (оставляем стандартные)
                                        bld.block.fullIcon  // Спрайт-заглушка
                                    );

                                    // 3. Высчитываем вектор направленного импульса взрыва по ротации пули/удара (b.rotation)
                                    var strikeVelX = Math.cos(b.rotation * Mathf.degRad) * 80;
                                    var strikeVelY = Math.sin(b.rotation * Mathf.degRad) * 80;

                                    // 4. Вызываем твой метод Fragment для тотального разрушения текстуры здания
                                    Fragment(
                                        bld.block.fullIcon, // Исходный спрайт разрушаемого здания
                                        strikeVelX, strikeVelY, // Направленная скорость отлета кусков стен
                                        70,                 // cone (разлет обломков постройки широким веером в 70 градусов)
                                        buildingDebrisTemplate // Наш подготовленный конфиг
                                    );

                                }


                                // Сервер наносит урон и шлет пакет клиентам
                                bld.damage(bld.maxHealth * 0.15);
                            }
                        }
                    }
                }
            }
        }
    })
});



 
// Удаляем старое значение здоровья
octoOverlord.stats.remove(Stat.health);

// Добавляем новое значение через stats.add
octoOverlord.stats.add(Stat.health, "NaN"); 



octoOverlord.weapons.addAll([nukeWeapon, singularityWeapon, matrixVirus, galacticFall, missileSwarm]);





const alexUnit = extend(UnitType, "alex", {
    localizedName: "[red]a[blue]l[white]ex",
    description: "Создатель игры",
    details: "Вообще-то это был секрет",
    
    flying: true,
    health: 20000000,
    armor: 1200,
    speed: 5,
    accel: 0.2,
    drag: 0.1,
    maxRange: 80000,
    hitSize: 8,
    
    rotateSpeed: 8,
    rotateMoveFirst: false,
    
    buildSpeed: 120000,
    mineSpeed: 0, // По умолчанию
    
    alwaysUnlocked: true,
    isEnemy: true,
    drawCell: false,
    outlines: false,
    createWreck: false,
    
    engineSize: 0,
    engineOffset: 0,
    
    deathExplosionEffect: Fx.none,
    loopSound: Sounds.none,
    loopSoundVolume: 1.5,

    // Инициализация иммунитетов
        init() {

        
        // Создаем пустой набор иммунитетов
        this.immunities = new ObjectSet();
        
        // Динамически добавляем ВСЕ эффекты, которые есть в базе данных игры
        Vars.content.statusEffects().each(e => {
            this.immunities.add(e);
        });
    }
});


alexUnit.constructor = () => {
    return extend(UnitEntity, {
        destroy() {
            // Эпичный VFX и звук перед смертью
            if(typeof creatorSpawnVFX !== 'undefined') creatorSpawnVFX.at(this.x, this.y);
            
            Time.run(120, () => {
                
                if(!Vars.net.client()){
                    // Спавним Оверлорда
                    let god = octoOverlord.spawn(this.team, this.x, this.y);
                    god.rotation = this.rotation;
                }
            });

            this.super$destroy();
        }
    });
};






// 1. Create the abilities separately to ensure properties are set correctly
const bossStatus = new StatusFieldAbility(StatusEffects.boss, 600, 60, 240); // 240 is range

const energyField = new EnergyFieldAbility(55, 60, 320); // damage, reload, range
energyField.status = Vars.content.getByName(ContentType.status, "mod-die");
energyField.statusDuration = 6000;
energyField.maxTargets = 1000;
energyField.color = Color.valueOf("8f9aff");

const regen = new RegenAbility();
regen.amount = 0.25;

// 2. Add them to the unit
alexUnit.abilities.add(bossStatus, energyField, regen);


alexUnit.weapons.add(
    // 1. Continuous Laser
    extend(Weapon, {
        reload: 60,
        x: 2, y: 4,
        mirror: true,
        rotate: false,
        shootSound: Sounds.none,
        continuous: true,
        bullet: extend(ContinuousLaserBulletType, {
            length: 8000,
            damage: 443600.58,
            width: 0.5,
            lifetime: 600,
            pierce: true,
            pierceArmor: true,
            hitColor: Color.valueOf("0000ff"),
            colors: [Color.valueOf("0000ff"), Color.white]
        })
    }),
    
    // 2. Railgun / Laser
    extend(Weapon, {
        reload: 900,
        x: 0, y: 8,
        mirror: false,
        shootSound: Sounds.none,
        bullet: extend(LaserBulletType, {
            length: 8000,
            lifetime: 30,
            pierce: true,
            hitEffect: Fx.titanSmoke,
            hitColor: Color.valueOf("0000ff")
        })
    })
);

const megaLaser = extend(Weapon, {
    reload: 2400,
    x: 0, 
    y: 8,
    mirror: false,
    continuous: true,
    // ИСПОРАВЛЕНО: Двоеточие вместо знака равенства
    shootSound: Vars.tree.loadSound("megaStrongLaser"), 
    
    bullet: extend(ContinuousLaserBulletType, {
        length: 8000, // 80000 — это слишком много, может лагать. 800 хватит на весь экран.
        damage: 1172877.16,
        width: 90,
        lifetime: 600,
        status: StatusEffects.disarmed,
        statusDuration: 120,
        colors: [Color.valueOf("2a3fff"), Color.valueOf("4755db"), Color.valueOf("8f9aff"), Color.white],
        fadeTime: 60,
        strokeFrom: 1.25,
        strokeTo: 0.75
    })
});

// Добавляем это оружие юниту
alexUnit.weapons.add(megaLaser);





const elena = extend(UnitType, "elena", {
    // Основные настройки
    localizedName: "[pink]ele[sky]na",
    description: "Создательница игры",
    details: "[pink]Мне нравятся Пуни!",
    alwaysUnlocked: true,
    armor: 60,
    buildSpeed: 120000,
    health: 107393,
    hitSize: 8,
    maxRange: 800,
    speed: 5,
    accel: 0.2,
    drag: 0.1,
    rotateSpeed: 8,
    flying: true,
    outlines: false,
    drawCell: false,
    isEnemy: true,
    
    // Эффекты и звуки
    loopSound: Sounds.none,
    loopSoundVolume: 1.5,
    deathExplosionEffect: Fx.none,
    engineSize: 0,
    createWreck: false
});

// Указываем конструктор (сущность юнита)
elena.immunities = new ObjectSet();
Vars.content.statusEffects().each(e => {
    if(e.name != "boss") elena.immunities.add(e);
});

elena.constructor = () => {
    return extend(UnitEntity, {
        update() {
            this.super$update();
            this.health = this.maxHealth; // Бессмертие
        },

        destroy() {
            this.super$destroy();
        }
    });
};








elena.abilities.add(
    new StatusFieldAbility(StatusEffects.boss, 600, 60, 40)
);

const colapse = Vars.content.getByName(ContentType.status, "mod-atom-colapse");

elena.weapons.add(
    // 1. Шрапнель
    (() => {
        const w = new Weapon();
        w.reload = 120;
        w.x = 4;
        w.y = 4;
        w.mirror = false;
        w.shootSound = Vars.tree.loadSound("lightSwShoot");
        w.bullet = extend(ShrapnelBulletType, {
            length: 800,
            damage: 97370,
            width: 48,
            serrations: 4,
            toColor: Color.valueOf("ff69b4"),
            hitShake: 55,
            pierce: true,
            pierceBuilding: true,
            pierceArmor: true
        });
        return w;
    })(),

    // 2. Смертельное оружие (спавнит alex)
    (() => {
        const w = new Weapon();
        w.reload = 10; 
        w.shootOnDeath = true;
        w.controllable = false;
        w.aiControllable = false;
        w.bullet = extend(BasicBulletType, {
            lifetime: 600,
            damage: 1000000,
            speed: 0,
            despawnEffect: Fx.spawn,
            hitEffect: Fx.none,
            // Ищем кастомный статус "atom-colapse"
            status: colapse,
            statusDuration: 3600,
            despawnUnit: alexUnit, 
            sprite: "large-bomb",
            width: 16,
            height: 16,
            backColor: Color.blue,
            frontColor: Color.white,
            spin: 6,
            pierce: true,
            pierceArmor: true
        });
        return w;
    })(),

    // 3. Непрерывный лазер
    (() => {
        const w = new Weapon();
        w.reload = 2400;
        w.x = 0;
        w.y = 8;
        w.mirror = false;
        w.continuous = true;
        w.shootSound = Vars.tree.loadSound("megaStrongLaser"); 
        w.bullet = extend(ContinuousLaserBulletType, {
            damage: 6955,
            length: 800,
            width: 90,
            lifetime: 600,
            colors: [Color.valueOf("ff00ff"), Color.valueOf("ff69b4"), Color.valueOf("e6e6fa"), Color.white],
            killEffect: Fx.none, 
            status: StatusEffects.disarmed,
            statusDuration: 120,
            pierceArmor: true
        });
        return w;
    })() // Убрана лишняя закрывающая скобка elena.weapons.add
);

print("Пунь-пунь!");


const purpleFire = new Effect(30, e => {
    Draw.color(Color.valueOf("d535d9"), Color.valueOf("8a2be2"), e.fin()); // Градиент от светло-фиолетового к темному
    
    // Рисуем несколько случайных кругов, которые уменьшаются со временем
    Fill.circle(e.x, e.y, e.fout() * 2 + Mathf.random(1));
    
    // Добавляем немного "искр"
    Angles.randLenVectors(e.id, 2, 1 + e.fin() * 10, (x, y) => {
        Fill.circle(e.x + x, e.y + y, e.fout() * 1.2);
    });
});


let karmaEffect = null;

// Ищем эффект один раз при загрузке
Events.on(ClientLoadEvent, () => {
    // Пытаемся найти по ID (замените на ваш префикс-mod-KR)
    karmaEffect = Vars.content.getByName(ContentType.status, "mod-KR") || 
                  Vars.content.statusEffects().find(s => s.name.includes("KR"));
    
    if(karmaEffect) Log.info(">>> Karma Effect Loaded: " + karmaEffect.name);
});

// Глобальный цикл обновления (вместо переопределения метода)
Events.run(Trigger.update, () => {
    if(!karmaEffect) return;

    Groups.unit.each(unit => {
        if(unit.hasEffect(karmaEffect)){
            // Урон: 10% от макс HP в сек
            let dmg = (unit.maxHealth / 10) / 60 * Time.delta;

            if (unit.health > 1) {
                // Прямое изменение здоровья
                unit.health = Math.max(1, unit.health - dmg);
            }

            // Визуал
            // Визуал (наш кастомный фиолетовый огонь)
            if(Mathf.chance(0.2)) {
                purpleFire.at(
                    unit.x + Mathf.range(unit.hitSize / 2),
                    unit.y + Mathf.range(unit.hitSize / 2)
                );
            }
        }
    });
});








function pulse() {
    return 1 + Mathf.absin(10, 0.1);
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И КОНСТАНТЫ ---
const getSound = (name) => {
    let s = Vars.tree.loadSound(name);
    if(!s || s == Sounds.none) s = Vars.tree.loadSound(name + ".ogg");
    return s || Sounds.none;
};

// Загрузка звуков
const s_charge = getSound("sweepCharge");
const s_shoot = getSound("sweepShoot");
const s_loop = getSound("sweepLoop");

const mainHex = "d535d9";
const c_glow = new Color(Color.valueOf(mainHex)).set(1, 1, 1, 0.4); 
const c_mid = Color.valueOf(mainHex);
const c_white = Color.white;
const c_dark = Color.valueOf("4a2bb3");

const laserColors = [c_glow, c_mid, c_white];
const laserWidths = [1.5, 1.0, 0.8];




const SweepLaser = extend(ContinuousLaserBulletType, {
    length: 2500,
    width: 180,
    lifetime: 900, 
    damage: 0, 
    pierce: true,
    pierceArmor: true,
    pierceCap: -1,
    knockback: 60,

    timeWidth(b) {
        let w1 = 5; 
        let warmUp = (b.time - 140) / 5;
        let fadeOut = (this.lifetime - b.time) / 80;
        let currentW = (w1 * Mathf.clamp(b.time / 60) + (this.width - w1) * Interp.pow2Out.apply(Mathf.clamp(warmUp)));
        return currentW * Interp.pow3In.apply(Mathf.clamp(fadeOut));
    },

    update(b) {
        this.super$update(b);
        
        const chargeTime = 140;
        const isShooting = b.time > chargeTime;
        const curWidth = this.timeWidth(b);

        if (!b.data) {
            b.data = { shotFired: false, charged: false, loopSource: null };
        }

        // 1. ЗВУК ЗАРЯДКИ
        if (b.time < 1 && !b.data.charged) {
            if (s_charge != Sounds.none) s_charge.at(b.x, b.y, 1.2);
            b.data.charged = true;
        }

        // 2. ТРИГГЕР ВЫСТРЕЛА + СТАРТ ПЕТЛИ
        /*if (isShooting && !b.data.shotFired) {
            if (s_shoot != Sounds.none) s_shoot.at(b.x, b.y, 1.6);
            if (s_loop != Sounds.none && b.data.loopSource == null) {
                let res = s_loop.loop(b.x, b.y, 1.3);
                if (typeof res === 'object' && res !== null) b.data.loopSource = res;
            }
            Vars.renderer.shake(80, 90); 
            Fx.shockwave.at(b.x, b.y);
            b.data.shotFired = true;
        }*/

        // Обновление позиции петли (раз в 3 тика для чистоты звука)
        if (b.data.loopSource != null && b.timer.get(5, 3)) {
            try { b.data.loopSource.set(b.x, b.y); } catch(e) { b.data.loopSource = null; }
        }

        // --- ПОЛНАЯ ЛОГИКА ВЗАИМОДЕЙСТВИЯ (БЕЗ СНОСОВ) ---
        if (isShooting) {
            const vx = b.x + Angles.trnsx(b.rotation(), this.length);
            const vy = b.y + Angles.trnsy(b.rotation(), this.length);

            // А. ВЫЖИГАНИЕ ЗЕМЛИ (Оптимизированный шаг)
            for(let i = 0; i < this.length; i += 32) {
                let px = b.x + Angles.trnsx(b.rotation(), i);
                let py = b.y + Angles.trnsy(b.rotation(), i);
                let tile = Vars.world.tileWorld(px, py);
                if(tile != null && Mathf.chance(0.7)) Fires.create(tile);
            }

            // Б. УРОН ПО ЮНИТАМ (KR + СРЕЗ БРОНИ + 10% HP)
            Units.nearbyEnemies(b.team, b.x - this.length, b.y - this.length, this.length * 2, this.length * 2, u => {
                const dist = Intersector.distanceLinePoint(b.x, b.y, vx, vy, u.x, u.y);
                if (dist < (curWidth / 2 + u.hitSize / 2)) {
                    u.armor = Math.max(-1000, u.armor - 100 * Time.delta);
                    
                    let sss = Interp.pow2In.apply(Mathf.clamp(1 - b.dst(u) / this.length)) * this.length;
                    let force = (60 + sss / 2.63) * Time.delta;
                    u.vel.add(Angles.trnsx(b.rotation(), force / 100), Angles.trnsy(b.rotation(), force / 100));

                    // ТОТ САМЫЙ КР-УРОН
                    const baseDmg = 600000 / 60 * Time.delta;
                    const percentDmg = (u.maxHealth > 10000) ? (u.maxHealth * 0.45) / 60 * Time.delta : 0;
                    const finalDmg = baseDmg + percentDmg;

                    u.apply(karmaEffect, 400);

                    if (u.health <= finalDmg + 1) {
                        // 1. Проверяем существование метода Disintegrate по правилам Rhino JS
                        if (typeof Disintegrate !== "undefined") {
                            
                            // Поскольку лазер бьет по направлению пули (u.rotation), 
                            // рассчитываем линию разреза перпендикулярно вектору луча
                            var strikeAngle = u.rotation;
                            var unitSizeWorld = u.hitSize * Draw.scl;
                            var cutVec = new Vec2().trns(strikeAngle + 90, unitSizeWorld / 2);
                            
                            var x1 = u.x - cutVec.x;
                            var y1 = u.y - cutVec.y;
                            var x2 = u.x + cutVec.x;
                            var y2 = u.y + cutVec.y;

                            // 2. Вызываем попиксельный испепелятор шва лазерного разреза
                            Disintegrate(
                                u.type.fullIcon,                // object (Текстура юнита)
                                x1, y1,                         // x1, y1
                                x2, y2,                         // x2, y2
                                8,                              // width (Толщина гига-лазера — 8 пикселей)
                                Color.valueOf("ffffff"),        // colorTo (Ослепительно белая вспышка на лезвии луча)
                                Color.valueOf("ff5500"),        // sparkColor (Раскаленные докрасна искры металла)
                                Color.valueOf("333333")         // ashColor (Густая угольно-черная копоть и сажа)
                            );
                        }
                        
                        // СЕТЕВОЙ ФИКС: Честно убиваем юнита по сети для синхронизации серверов
                        u.kill(); 
                    } else { 
                        u.damage(finalDmg); 
                    }

                }
            });

            // В. УРОН ПО ПОСТРОЙКАМ (Включая Team.derelict)
            // Используем buildWorld для стабильности вместо raycast
            for(let i = 0; i < this.length; i += 40) {
                let bx = b.x + Angles.trnsx(b.rotation(), i);
                let by = b.y + Angles.trnsy(b.rotation(), i);
                let build = Vars.world.buildWorld(bx, by);
                
                if (build != null && build.team != b.team) {
                    build.damage(15000 / 60 * Time.delta);
                    if (build.team == Team.derelict) build.kill();
                }
            }

            // Г. СТИРАНИЕ ПУЛЬ (Защитное поле)
            Groups.bullet.intersect(b.x - this.length, b.y - this.length, this.length * 2, this.length * 2, d => {
                if (d.team != b.team && Angles.within(b.rotation(), b.angleTo(d), 14)) {
                    d.remove();
                }
            });
        }
    },

        draw(b) {
    const vx = b.x + Angles.trnsx(b.rotation(), this.length);
    const vy = b.y + Angles.trnsy(b.rotation(), this.length);
    const w = this.timeWidth(b);
    const isShooting = b.time > 140;
    let flashRegion = Core.atlas.find("mod-flash");

    if (!isShooting) {
        // --- DRAW: ЗАРЯДКА ---
        let f = b.time / 140;
        Draw.color(c_mid);
        Draw.alpha(0.2 + (f * 0.5) + Mathf.absin(4, 0.25));
        Lines.stroke(1.5 + f * 2);
        Lines.line(b.x, b.y, vx, vy);

        Draw.color(c_white, c_mid, 1 - f);
        for(let i = 0; i < 4; i++){
            let angle = b.rotation() + i * 90 + (1 - f) * 120;
            Drawf.tri(b.x, b.y, 12 * (1 - f), 50 * f, angle);
        }

        Draw.color(c_white);
        Draw.rect(flashRegion, b.x, b.y, 50 * f, 50 * f, b.time * 2);
        Draw.color(c_mid);
        Draw.rect(flashRegion, b.x, b.y, 35 * f, 35 * f, -b.time * 3);

        Draw.color(Color.black);
        Fill.circle(b.x, b.y, 9 * f);
        } else {
        let fout = b.fout();
        let pulse = 1 + Mathf.absin(8, 0.15);
        let sw = w * pulse;

        // 1. Настройка размеров (подкрути под себя)
        let baseTriLen = 45 * fout; // Длина треугольника от начала лазера до "иглы"
        let insertDepth = 15 * fout; // На сколько лазер заходит ВНУТРЬ треугольника

        // 2. Точка, где лазер реально НАЧИНАЕТСЯ (чуть ближе к дулу, чем конец треугольника)
        let laserStartX = b.x + Angles.trnsx(b.rotation(), insertDepth);
        let laserStartY = b.y + Angles.trnsy(b.rotation(), insertDepth);

        // 3. Точка, где треугольник максимально ШИРОКИЙ (стык с лазером)
        let triWideX = b.x + Angles.trnsx(b.rotation(), baseTriLen);
        let triWideY = b.y + Angles.trnsy(b.rotation(), baseTriLen);

        for (let i = 0; i < 3; i++) {
            Draw.color(laserColors[i]);
            let currentSw = sw * laserWidths[i];

            // --- ТРЕУГОЛЬНИК (Узкий у дула, широкий у лазера) ---
            let x1 = b.x; // Остриё треугольника (в самом дуле)
            let y1 = b.y;

            // Широкая часть треугольника (перпендикулярно оси в точке triWide)
            let triSideWidth = currentSw * 2.5; // Коэффициент "раскрыва" раструба
            
            let x2 = triWideX + Angles.trnsx(b.rotation() + 90, triSideWidth);
            let y2 = triWideY + Angles.trnsy(b.rotation() + 90, triSideWidth);

            let x3 = triWideX + Angles.trnsx(b.rotation() - 90, triSideWidth);
            let y3 = triWideY + Angles.trnsy(b.rotation() - 90, triSideWidth);

            Fill.tri(x1, y1, x2, y2, x3, y3);

            // --- ОСНОВНОЙ ЛАЗЕР ---
            // Рисуем от laserStartX, чтобы он "накладывался" на треугольник
            Lines.stroke(currentSw);
            Lines.line(laserStartX, laserStartY, vx, vy);
            
            // Наконечник
            Drawf.tri(vx, vy, currentSw * 2, sw * 3, b.rotation());
        }


        // 3. ТЕКСТУРА FLASH (УДАЛЕНА ИЛИ СИЛЬНО УМЕНЬШЕНА ПО ЖЕЛАНИЮ)
        // Если она тебе всё же нужна как маленькая точка в дуле, оставь sw * 0.5
        // Если совсем не нужна - просто удали этот блок.

        // 4. KR-ЧАСТИЦЫ (Начинаются от основного лазера)
        let scl = Interp.pow2Out.apply(Mathf.clamp((b.time - 140) / 15)) * fout;
        let rand = new Rand();
        rand.setSeed(b.id + 1236);
        for (let i = 0; i < 45; i++) {
            let d = rand.random(20, 40);
            let dtime = ((Time.time + rand.random(d)) % d) / d;
            let slope = Interp.pow2Out.apply(Mathf.curve(dtime, 0, 0.05) * Mathf.curve(1 - dtime, 0, 0.05));
            let dh = rand.random(60, 130) * scl * slope;
            let dw = dh * rand.random(0.1, 0.25);
            let rx = rand.range(sw / 2.5);
            // Частицы летят от startX, startY
            let yp = baseTriLen + dtime * (this.length - dh - baseTriLen); 
            Draw.color(rand.chance(0.3) ? c_white : c_mid);
            let px = b.x + Angles.trnsx(b.rotation(), yp, rx);
            let py = b.y + Angles.trnsy(b.rotation(), yp, rx);
            Drawf.tri(px, py, dw, dh / 2, b.rotation());
            Drawf.tri(px, py, dw, -dh / 2, b.rotation());
        }

        // 5. GHOST LINES (Тоже начинаются от стыка)
        Draw.color(c_mid);
        Draw.alpha(0.5 * fout);
        for(let i of [-1, 1]) {
            let ox = Angles.trnsx(b.rotation() + 90, 12 * i);
            let oy = Angles.trnsy(b.rotation() + 90, 12 * i);
            Lines.stroke(3);
            Lines.line(laserStartX + ox, laserStartY + oy, vx + ox, vy + oy);
        }

        // 7. СВЕТ
        Drawf.light(b.x, b.y, vx, vy, sw * 3, c_mid, 0.8 * fout);
        Draw.color(c_white);
        Fill.circle(vx, vy, sw * 0.8 + Mathf.random(4));
    }

    Draw.reset();
},



    removed(b) {
        if (b.data && b.data.loopSource != null) {
            try { b.data.loopSource.stop(); } catch(e) {}
            b.data.loopSource = null;
        }
        this.super$removed(b);
    },

    despawned(b) {
        if (b.data && b.data.loopSource != null) {
            try { b.data.loopSource.stop(); } catch(e) {}
            b.data.loopSource = null;
        }
        this.super$despawned(b);
    }
});



const grandBlaster = extend(UnitType, "grand-blaster", {
    health: 12000000,
    armor: 20,
    hitSize: 30,
    speed: 2.2,
    rotateSpeed: 3,
    flying: true,
    engineSize: 0,
    drawCell: false,
    outlines: false,

    draw(unit) {
        // Рисуем стандартную тень под юнитом
        this.super$draw(unit);

        // Поиск пули SweepLaser, принадлежащей этому юниту
        let bullet = Groups.bullet.find(b => b.owner === unit && b.type === SweepLaser);
        
        let f = 0;
        if (bullet != null) {
            // f растет от 0 до 1 за время зарядки (140 тиков)
            f = Mathf.clamp(bullet.time / 140);
        }

        let trns = f * 15; 
        let rot = unit.rotation - 90;

        // ПОРЯДОК СЛОЕВ: Ядро (внизу) -> Половинки (вверху)
        
        // 1. ЯДРО
        Draw.color(Color.white);
        Draw.rect(Core.atlas.find("mod-blaster-core"), unit.x, unit.y, rot);

        // 2. ПОЛОВИНКИ ЛИЦА
        // Левая
        Draw.rect(
            Core.atlas.find("mod-blaster-left"), 
            unit.x + Angles.trnsx(unit.rotation + 90, trns), 
            unit.y + Angles.trnsy(unit.rotation + 90, trns), 
            rot
        );

        // Правая
        Draw.rect(
            Core.atlas.find("mod-blaster-right"), 
            unit.x + Angles.trnsx(unit.rotation - 90, trns), 
            unit.y + Angles.trnsy(unit.rotation - 90, trns), 
            rot
        );

        Draw.reset();
    } // <-- Фигурная скобка, которая закрывает методы внутри extend
}); // <-- Закрывает саму функцию extend


// Конструктор и AI (вне extend)
grandBlaster.constructor = () => extend(UnitEntity, {});
grandBlaster.aiController = () => new FlyingAI();

const sweep = Vars.tree.loadSound("sweepLoop");
// Оружие добавляем через .add() как раньше
grandBlaster.weapons.add(extend(Weapon, {
    x: 0,
    y: 0,
    shootY: 0,
    reload: 260,
    mirror: false,
    continuous: true,
    shootSound: sweep,
    bullet: SweepLaser
}));




/*
let lastEncounterTime = 0;
const ENCOUNTER_COOLDOWN = 600;

Events.run(Trigger.update, () => {
    // Если мы уже в бою или игра на паузе — ничего не делаем
    if (global.inBattle || Vars.state.isPaused()) return;
    
    // Кулдаун между битвами
    if (Time.time < lastEncounterTime + ENCOUNTER_COOLDOWN) return;

    // Проверка каждые 10 тиков (чаще, чтобы не пропустить)
    if (Tick % 10 === 0) {
        let player = Vars.player.unit();
        if (!player) return;

        // ПОИСК: ищем любого юнита Team.green в радиусе 160 (20 тайлов)
        // null заменяем на команду игрока для корректного поиска "врагов" для него
        let boss = Units.closest(Team.green, player.x, player.y, 160, u => {
            return u.type && (u.type.name.includes("haker") || u.type.name.includes("voen-pun"));
        });

        if (boss != null) {
            // МГНОВЕННЫЙ ЗАПУСК БЕЗ VFX
            lastEncounterTime = Time.time;
            
            // Если функция в другом файле, убедись, что она в global
            if (typeof global.startPunyBattle === "function") {
                global.startPunyBattle(boss);
            }
        }
    }
});*/


const SAVE_KEY = "puny_tutorial_finished";

// --- 1. ВЫБОР ПРИ ЗАПУСКЕ ---
Events.on(ClientLoadEvent, () => {
    Vars.ui.settings.game.checkPref(SAVE_KEY, false);
    
    if(!Core.settings.getBool(SAVE_KEY, false)){
        Time.run(60, () => {
            const dialog = new BaseDialog("PUN MOD");
            dialog.cont.add("Пройти обучение?").row();
            
            dialog.cont.button("ДА", () => {
                dialog.hide();
                launchTutorial();
            }).size(200, 60);
            
            dialog.cont.button("НЕТ", () => {
                dialog.hide();
                Core.settings.put(SAVE_KEY, true);
                Core.settings.manualSave();
            }).size(200, 60);
            dialog.show();
        });
    }
});

function launchTutorial(){
    let mapFile = Vars.tree.get("maps/sector-zero.msav") || Vars.tree.get("sector-zero.msav");
    if (mapFile != null) {
        try {
            let map = MapIO.createMap(mapFile, true);
            Vars.world.loadMap(map);
            Vars.state.rules = map.rules();
            Vars.state.set(GameState.State.playing);
            Vars.logic.play();
        } catch(e) { Log.err(e); }
    }
}

// --- 2. ЛОГИКА ЗАВЕРШЕНИЯ (Смерть врага) ---
Events.on(UnitDestroyEvent, e => {
    // Проверяем: мы в туториале? (карта sector-zero)
    if(Vars.state.isPlaying() && Vars.state.rules.title === "sector-zero"){
        
        // Проверяем: убитый юнит был врагом (Team.crux или Team.green)
        if(Vars.state.rules.title === "sector-zero" && e.unit.team != Vars.player.team() && e.unit.type && e.unit.type.name.startsWith("mod-")){
    
            
            // Сохраняем прогресс
            Core.settings.put(SAVE_KEY, true);
            Core.settings.manualSave();
            

            // Переход в Village через 2 секунды
            Timer.schedule(() => {
                let next = Vars.content.sectors().find(s => s.name.includes("village"));
                if (next) Vars.control.playSector(next);
            }, 2);
        }
    }
});



// Регистрируем эффект яда борщевика (Фотокумарин)
const hogweedPoison = new StatusEffect("hogweed-poison");
hogweedPoison.speedMultiplier = 0.8; 
hogweedPoison.color = Color.valueOf("aaff77");
hogweedPoison.show = true; // Игрок будет видеть иконку капли сока

// --- 1. РЕГИСТРАЦИЯ СТАТУСОВ (Программная) ---
const beeSting = new StatusEffect("bee-sting");
beeSting.damage = 0.25;
beeSting.speedMultiplier = 0.6;
beeSting.color = Color.yellow;

const stickyTar = new StatusEffect("sticky-tar");
stickyTar.speedMultiplier = 0.3;
stickyTar.color = Color.valueOf("222222");

// --- 2. КАСТОМНЫЕ ЭФФЕКТЫ ---
const beeCloud = new Effect(40, e => {
    Draw.color(Color.yellow, Color.black, e.fin());
    Angles.randLenVectors(e.id, 10, e.fin() * 15, (x, y) => {
        Fill.circle(e.x + x, e.y + y, 0.7);
    });
});


const sporeSmokeBurst = new Effect(60, e => {
    Draw.color(Color.valueOf("d535d9"), Color.valueOf("8a2be2"), e.fin());
    Angles.randLenVectors(e.id, 20, e.fin() * 30, (x, y) => {
        Fill.circle(e.x + x, e.y + y, e.fout() * 5);
    });
});


Events.run(Trigger.update, () => {
    // ПРОВЕРКА СВЕТА ДЛЯ [[Лучшей ночи в твоей жизни!]]
    let isDay = Vars.state.rules.ambientLight.a < 0.5;

    Groups.unit.each(u => {
        // --- 1. ПРОВЕРКА ЭФФЕКТОВ (НЕ ПРОПУСТИ СВОЙ ШАНС!) ---
        if(u.hasEffect(hogweedPoison) && isDay){
            u.damageContinuous(35 / 60);
            if(Mathf.chance(0.05)) Fx.plasticburn.at(u.x, u.y);
        }
        
        if(u.hasEffect(stickyTar) && u.hasEffect(StatusEffects.burning)){
            u.damageContinuous(40 / 60);
            if(Mathf.chance(0.1)) smokeBurst.at(u.x, u.y);
        }

        // --- 2. ПОИСК ОБЪЕКТА (ГДЕ МОИ [[Проценты]]?!) ---
        let tile = Vars.world.tileWorld(u.x, u.y);
        if(tile == null) return;
        
        // МЫ СМОТРИМ ПРЯМО В [[Сердце]] БЛОКА!
        let b = tile.block();
        if(b == null || b.name == null) return;
        
        let n = String(b.name);

        // --- 3. ЛОГИКА ОБРАБОТКИ (ДЕНЬГИ! ДЕНЬГИ! ДЕНЬГИ!) ---
        
        // БОРЩЕВИК (mod-hogweed) - [[Опасно для кошелька!]]
        if(n.includes("hogweed")){
            if(isDay) u.damageContinuous(45 / 60);
            u.apply(hogweedPoison, 600); 
            if(Mathf.chance(0.02)) Fx.plasticburn.at(u.x, u.y);
        }
        // КРАПИВА (mod-nettle) - [[Бесплатная щекотка!]]
        else if(n.includes("nettle")){
            u.apply(StatusEffects.slow, 120);
            if(u.health > 1.1) u.damage(0.1);
            if(Mathf.chance(0.05)) Fx.hitBulletSmall.at(u.x, u.y);
        }
        // КАКТУС - [[Колючие скидки!]]
        else if(n.includes("cactus-prop")){
            u.damageContinuous(16 / 60);
            u.apply(StatusEffects.slow, 30);
            if(Mathf.chance(0.02)) Fx.plasticExplosion.at(u.x, u.y);
        }
        // СПОРОВЫЙ ГРИБ (Конфуз) - [[Ты не знаешь, кто ты!]]
        else if(n.includes("spore-mushroom")){
            u.apply(StatusEffects.disarmed, 180);
            u.apply(StatusEffects.slow, 180);
            if(Mathf.chance(0.05)) sporeSmokeBurst.at(u.x, u.y);
        }
        // ОГНЕЦВЕТ - [[ГОРЯЧАЯ РАСПРОДАЖА!]]
        else if(n.includes("fire-flower")){
            u.apply(StatusEffects.burning, 60);
            u.apply(StatusEffects.fast, 120);
        }
        // МЯТА (ОСВЕЖЕНИЕ) - [[Дыши свободно!]]
        else if(n.includes("mint-leaf")){
            u.apply(StatusEffects.invincible, 90);
            u.apply(StatusEffects.fast, 240);
            u.heal(25 / 60);
            if(Mathf.chance(0.05)) Fx.healWave.at(u.x, u.y);
        }
        // ПЧЕЛИНЫЙ УЛЕЙ - [[Жужжащий бизнес!]]
        else if(n.includes("beehive")){
            if(typeof beeCloud !== 'undefined') beeCloud.at(u.x, u.y);
            u.apply(beeSting, 240);
            if(Mathf.chance(0.1)) Fx.sparkShoot.at(u.x, u.y);
        }
        // ОСОКА-БРИТВА - [[Острые цены!]]
        else if(n.includes("razor-grass")){
            let speed = u.vel.len();
            if(speed > 0.2){
                u.damageContinuous(speed * 15);
                if(Mathf.chance(0.2)) Fx.plasticExplosion.at(u.x, u.y);
            }
        }
        // ДЫМОВЫЕ ГРИБЫ - [[Купи туман, получи ничего!]]
        else if(n.includes("smoke-mushroom")){
            if(Mathf.chance(0.05)){
                if(typeof smokeBurst !== 'undefined') smokeBurst.at(u.x, u.y);
                u.apply(StatusEffects.slow, 180);
                u.apply(StatusEffects.disarmed, 90);
            }
        }
        // СМОЛЯНОЙ КОРЕНЬ - [[Липкая ситуация!]]
        else if(n.includes("tar-root")){
            u.apply(stickyTar, 60);
        }
    });
});





let snowgraveMarker = null;

Events.on(ClientLoadEvent, () => {
    // Поиск статуса из Hjson
    snowgraveMarker = Vars.content.getByName(ContentType.status, "mod-snowgrave") || 
                      Vars.content.statusEffects().find(s => s.name.includes("snowgrave"));

    if(snowgraveMarker){
        Log.info(">>> [STATUS] Snowgrave found: " + snowgraveMarker.name);
    } else {
        Log.err(">>> [STATUS] Snowgrave NOT FOUND. Check Hjson.");
    }
});


// Визуал оставляем, так как Hjson не умеет рисовать спрайты поверх юнитов
Events.run(Trigger.draw, () => {
    if(!snowgraveMarker) return;
    Groups.unit.each(unit => {
        if(unit.hasEffect(snowgraveMarker)){
            // Используем явное указание слоя (Layer.units или число 110)
            Draw.z(118); 
            let img = Core.atlas.find("mod-crystal-sprite");
            if(img.found()){
                Draw.rect(img, unit.x, unit.y, unit.hitSize * 2.5, unit.hitSize * 2.5);
            } else {
                Draw.color(Color.cyan, 0.4);
                Fill.poly(unit.x, unit.y, 6, unit.hitSize * 1.8);
                Draw.reset();
            }
        }
    });
});









let iceShockMarker = null;

Events.on(ClientLoadEvent, () => {
    // Поиск статуса из Hjson
    iceShockMarker = Vars.content.getByName(ContentType.status, "mod-ice-shock") || 
                     Vars.content.statusEffects().find(s => s.name.includes("ice-shock"));

    if(iceShockMarker){
        Log.info(">>> [STATUS] Ice Shock found: " + iceShockMarker.name);
    } else {
        Log.err(">>> [STATUS] Ice Shock NOT FOUND. Check Hjson.");
    }
});



Events.run(Trigger.draw, () => {
    if(!iceShockMarker) return;
    Groups.unit.each(unit => {
        if(unit.hasEffect(iceShockMarker)){
            Draw.z(117.9);

            // 1. ОСНОВНОЙ ТОЛСТЫЙ СЛОЙ ЛЬДА
            // Рисуем голубой цвет с высокой непрозрачностью (0.8)
            Draw.color(Color.valueOf("84f8ff"), 0.8);
            Draw.rect(unit.type.fullIcon, unit.x, unit.y, unit.rotation - 90);

            // 2. ВТОРОЙ СЛОЙ ДЛЯ ГЛУБИНЫ (Additive)
            // Это "зажжет" голубой цвет, сделав его неоновым
            Draw.blend(Blending.additive);
            Draw.color(Color.valueOf("84f8ff"), 0.5);
            Draw.rect(unit.type.fullIcon, unit.x, unit.y, unit.rotation - 90);
            
            // 3. ФИНАЛЬНЫЙ БЛИК (Чистый белый по центру)
            Draw.color(Color.white, 0.2);
            Draw.rect(unit.type.fullIcon, unit.x, unit.y, unit.rotation - 90);

            Draw.blend();
            Draw.reset();
        }
    });
});

// 1. Эффекты
const daggerFx = new Effect(40, e => {
    Draw.color(Color.gray, Color.lightGray, e.fin());
    Lines.stroke(2 * e.fout());
    Lines.poly(e.x, e.y, 4, 10 + e.fin() * 15);
});

const maceFx = new Effect(40, e => {
    Draw.color(Color.orange, Color.red, e.fin());
    Fill.circle(e.x, e.y, e.fout() * 12);
    Angles.randLenVectors(e.id, 10, 20 * e.fin(), (x, y) => {
        Fill.circle(e.x + x, e.y + y, 2 * e.fout());
    });
});

const fortressFx = new Effect(60, e => {
    Draw.color(Color.gold, Color.orange, e.fin());
    Lines.stroke(4 * e.fout());
    Lines.circle(e.x, e.y, 5 + e.fin() * 25);
    Angles.randLenVectors(e.id, 20, 40 * e.fin(), (x, y) => {
        Lines.lineAngle(e.x + x, e.y + y, Mathf.angle(x, y), 2 + e.fout() * 4);
    });
});

const reignSpawnFx = new Effect(100, e => {
    // 1. Огромная золотая вспышка в центре
    Draw.color(Color.gold, Color.white, e.fin());
    Fill.circle(e.x, e.y, e.fout() * 40);

    // 2. Две расширяющиеся ударные волны (кольца)
    Lines.stroke(4 * e.fout());
    Lines.circle(e.x, e.y, 10 + e.fin() * 80);
    
    Draw.color(Color.lightGray);
    Lines.stroke(2 * e.fout());
    Lines.circle(e.x, e.y, 5 + e.fin() * 120);

    // 3. Разлетающиеся "осколки" (длинные полоски)
    Draw.color(Color.gold);
    Angles.randLenVectors(e.id, 30, 20 + 150 * e.fin(), (x, y) => {
        Lines.stroke(3 * e.fout());
        Lines.lineAngle(e.x + x, e.y + y, Mathf.angle(x, y), 2 + e.fout() * 15);
    });

    // 4. Эффект тряски экрана
    Effect.shake(8, 12, e.x, e.y);
});


const uList = [UnitTypes.dagger, UnitTypes.mace, UnitTypes.fortress, UnitTypes.reign];
// Для Reign (T5) добавим отдельный эффект, если его нет - используй fortressFx
const fList = [daggerFx, maceFx, fortressFx, reignSpawnFx]; 

const boomBlock = extend(Block, "random-spawner", {
    solid: true,
    update: true,
    category: Category.turret,
    buildVisibility: BuildVisibility.shown,
    buildType: () => extend(Building, {})
});

Events.on(TapEvent, e => {
    if (e.tile.build != null && e.tile.build.block == boomBlock) {
        const b = e.tile.build;
        const tx = b.x;
        const ty = b.y;
        const tTeam = b.team;

        // --- ЛОГИКА РАНДОМА ЧЕРЕЗ ЧИСТЫЙ JS ---
        let i;
        let rand = Math.random(); // Число от 0 до 1

        if (rand < 0.05) { // 5% шанс на T5 (Reign)
            i = 3;
        } else {
            // Остальные 95% делим между T1, T2 и T3
            i = Math.floor(Math.random() * 3); // Дает 0, 1 или 2
        }

        const unit = uList[i];
        const effect = fList[i];

        b.kill();

        Time.run(2, () => {
            if (effect != null) effect.at(tx, ty);
            
            if (unit != null) {
                unit.spawn(tTeam, tx, ty);
            }
        });
    }
});


/**
 * Класс для создания покадровых эффектов из бумажных рисунков.
 */
function SpriteEffect(spriteName, frameCount, frameTime, defaultSize) {
    // Сохраняем настройки в свойства объекта
    this.name = spriteName;
    this.frames = frameCount;
    this.speed = frameTime;
    this.size = defaultSize;

    // Создаем внутренний объект Mindustry Effect
    // Используем переменную self, чтобы не потерять контекст внутри функции
    var self = this;
    this.fx = new Effect(this.frames * this.speed, e => {
        // 1. Определяем текущий кадр
        let frame = Math.floor(e.fin() * self.frames);
        frame = Mathf.clamp(frame, 0, self.frames - 1);

        // 2. Ищем текстуру в атласе
        let region = Core.atlas.find(self.name + frame);
        
        // 3. Определяем размер (из rotation или дефолтный)
        let s = e.rotation > 0.1 ? e.rotation : self.size;

        // 4. Отрисовка
        Draw.color(Color.white);
        // Принудительно выводим на передний план (z-слой)
        Draw.z(Layer.effect + 10);

        if (region.found()) {
            Draw.rect(region, e.x, e.y, s, s, 0);
        } else {
            // Если картинка не найдена — рисуем ярко-розовый маркер (ошибка текстуры)
            Draw.color(Color.magenta);
            Fill.square(e.x, e.y, s / 2);
        }
    });

    // Метод для вызова эффекта в мире
    this.at = function(x, y, size) {
        this.fx.at(x, y, size || this.size);
    };
}

// --- ПРИМЕР ИСПОЛЬЗОВАНИЯ ---

// 1. Создаем экземпляр (обязательно с префиксом мода!)
const myBoom = new SpriteEffect("mod-frame_", 17, 3, 288);

Events.on(UnitDestroyEvent, e => {
    // e.unit — это объект погибшего юнита
    
    // Проверяем префикс вашего мода
    if(e.unit.type.name.startsWith("mod-")){
        // Вызываем эффект. 
        // Мы передаем размер (288) в параметр rotation эффекта
        myBoom.fx.at(e.unit.x, e.unit.y, e.unit.hitSize * 8);
        
        // Если вы хотите, чтобы размер зависел от крутости юнита:
        // let finalSize = 288 * (e.unit.hitSize / 20);
        // myBoom.fx.at(e.unit.x, e.unit.y, finalSize);
    }
});










/*
const VanillaEntityBase = Packages.mindustry.gen.Entityc;
const activeSpears = new Seq();

const PureFragmentEntity = extend(VanillaEntityBase, {
    x: 0, y: 0, mx: 0, my: 0, rot: 0,
    lifetime: 70.0, time: 0.0,
    data: null, isInitialized: false,

    init(spawnX, spawnY, angle, speed, dataBatch, bvx, bvy) {
        this.x = spawnX;
        this.y = spawnY;
        this.rot = Mathf.random(360);
        this.data = dataBatch;
        this.lifetime = 70.0;
        this.time = 0.0;
        this.isInitialized = true;

        this.mx = Mathf.cosDeg(angle) * speed + bvx * 0.4;
        this.my = Mathf.sinDeg(angle) * speed + bvy * 0.4;
        return this;
    },

    update() {
        if (!this.isInitialized) return;
        this.time += Time.delta;

        this.x += this.mx * Time.delta;
        this.y += this.my * Time.delta;

        this.mx *= Math.pow(0.93, Time.delta);
        this.my *= Math.pow(0.93, Time.delta);

        let rotSpeed = Mathf.randomSeed(this.id, -10, 10);
        this.rot += rotSpeed * Time.delta;

        if (Mathf.len(this.mx, this.my) < 0.15 || this.time >= this.lifetime) {
            this.remove();
        }
    },

    draw() {
        if (!this.isInitialized || !this.data || !this.data.mesh || !this.data.region) return;

        Draw.color(Color.white);
        let mesh = this.data.mesh;
        let region = this.data.region;
        let cos = Mathf.cosDeg(this.rot);
        let sin = Mathf.sinDeg(this.rot);

        let vertices = new FloatSeq();
        let colorBits = Color.white.toFloatBits();
        let mixColorBits = Color.clear.toFloatBits();

        for (let i = 0; i < mesh.vertices.length; i++) {
            let v = mesh.vertices[i];
            let tx = (v.x * cos - v.y * sin) + this.x;
            let ty = (v.x * sin + v.y * cos) + this.y;
            let u = Mathf.lerp(region.u, region.u2, v.uPct);
            let vTex = Mathf.lerp(region.v2, region.v, v.vPct);
            vertices.addAll(tx, ty, colorBits, u, vTex, mixColorBits);
        }
        Draw.vert(region.texture, vertices.items, 0, vertices.size);
    },

    serialize() { return false; }
});

function spawnPhysicalFragments(pos, team, region, baseSize, baseVelX, baseVelY) {
    if (!pos || !region || typeof region.texture === 'undefined' || !region.found()) return;

    let rand = new Rand(Math.floor(pos.x + pos.y * 31));
    let numFragments = rand.random(6, 10);
    let bvx = baseVelX || 0;
    let bvy = baseVelY || 0;

    for (let i = 0; i < numFragments; i++) {
        let minU = rand.random(0.0, 0.7);
        let maxU = minU + rand.random(0.2, 0.3);
        let minV = rand.random(0.0, 0.7);
        let maxV = minV + rand.random(0.2, 0.3);

        let localW = baseSize * rand.random(0.4, 0.7);
        let localH = baseSize * rand.random(0.4, 0.7);

        let skewX = localW * 0.15;
        let skewY = localH * 0.15;

        let meshData = {
            vertices: [
                { x: -localW/2 + rand.random(-skewX, skewX), y: -localH/2 + rand.random(-skewY, skewY), uPct: minU, vPct: minV },
                { x: -localW/2,                               y:  localH/2,                               uPct: minU, vPct: maxV },
                { x:  localW/2 + rand.random(-skewX, skewX), y:  localH/2 + rand.random(-skewY, skewY), uPct: maxU, vPct: maxV },
                { x: -localW/2 + rand.random(-skewX, skewX), y: -localH/2 + rand.random(-skewY, skewY), uPct: minU, vPct: minV },
                { x:  localW/2 + rand.random(-skewX, skewX), y:  localH/2 + rand.random(-skewY, skewY), uPct: maxU, vPct: maxV },
                { x:  localW/2,                               y: -localH/2,                               uPct: maxU, vPct: minV }
            ]
        };

        let dataBatch = { region: region, mesh: meshData };
        let angle = rand.random(360);
        let speed = rand.random(3, 6);

        let fragment = PureFragmentEntity.create();
        fragment.init(pos.x, pos.y, angle, speed, dataBatch, bvx, bvy);
        
        Groups.all.add(fragment);
        Groups.draw.add(fragment);
    }
}

const CustomSpearEntity = extend(VanillaEntityBase, {
    x: 0, y: 0, targetUnit: null, vx: 0, vy: 0, angle: 0, collided: false, team: null, speedMultiplier: 6, isInitialized: false,

    init(team, spawnX, spawnY, startAngle) {
        this.x = spawnX;
        this.y = spawnY;
        this.angle = startAngle;
        this.team = team;
        this.collided = false;
        this.targetUnit = null;
        this.speedMultiplier = 6;
        this.isInitialized = true;

        this.vx = Mathf.cosDeg(startAngle) * this.speedMultiplier;
        this.vy = Mathf.sinDeg(startAngle) * this.speedMultiplier;
        return this;
    },

    update() {
        if (!this.isInitialized) return;

        if (!this.collided) {
            this.speedMultiplier += 0.20 * Time.delta;
            this.vx = Mathf.cosDeg(this.angle) * this.speedMultiplier;
            this.vy = Mathf.sinDeg(this.angle) * this.speedMultiplier;

            this.x += this.vx * Time.delta;
            this.y += this.vy * Time.delta;

            if (this.x < 0 || this.x > Vars.world.width() * 8 || this.y < 0 || this.y > Vars.world.height() * 8) {
                this.remove();
                return;
            }

            let hit = Units.closestEnemy(this.team, this.x, this.y, 16, e => !e.dead);
            if (hit) {
                this.collided = true;
                this.targetUnit = hit;
                
                this.targetUnit.damage(this.targetUnit.maxHealth / 2);
                
                Fx.explosion.at(this.x, this.y);
                Sounds.blast.at(this.x, this.y, 1, 1.2);
            }
        } else {
            let victim = this.targetUnit;
            if (victim && !victim.dead && victim.isAdded()) {
                victim.x = this.x;
                victim.y = this.y;
                victim.vel.set(0, 0);

                if (victim.mounts) {
                    for (let i = 0; i < victim.mounts.length; i++) {
                        let m = victim.mounts[i];
                        m.reload = m.weapon.reload; 
                        m.shoot = false;
                    }
                }
            } else {
                if (victim && victim.dead) {
                    spawnPhysicalFragments(this, this.team, victim.type.region, victim.hitSize, this.vx, this.vy);
                }
                this.remove();
            }
        }
    },

    draw() {
        if (!this.isInitialized) return;
        Draw.color(Color.valueOf("ffa3b1"), Color.valueOf("d11d3b"), Mathf.absin(Time.time, 8, 1));
        Lines.stroke(4);
        Lines.lineAngle(this.x, this.y, this.angle, 35);
        Lines.lineAngle(this.x, this.y, this.angle + 140, 12);
        Lines.lineAngle(this.x, this.y, this.angle - 140, 12);
        Draw.reset();
    },

    serialize() { return false; }
});

const spearPureJSTurret = extend(PowerTurret, "spear-pure-js-turret", {
    size: 3, health: 3500, range: 600, reload: 120, shootType: Bullets.placeholder,
    update() {
        this.super$update();
        activeSpears.each(function(spear) {
            if (spear.isAdded()) {
                spear.update();
            } else {
                activeSpears.remove(spear);
            }
        });
    }
});

spearPureJSTurret.buildType = () => extend(PowerTurret.PowerTurretBuild, spearPureJSTurret, {
    shoot(type) {
        let angle = this.rotation; 
        let spear = CustomSpearEntity.create();
        spear.init(this.team, this.x, this.y, angle);
        
        Groups.all.add(spear);
        Groups.draw.add(spear);
        activeSpears.add(spear);
        
        Sounds.railgun.at(this.x, this.y);
        Fx.shootBig.at(this.x, this.y, angle);
    }
});

spearPureJSTurret.category = Category.turret;
spearPureJSTurret.hasPower = true;
spearPureJSTurret.consumePower(9.0);
spearPureJSTurret.buildCost = ItemStack.with(Items.copper, 150, Items.lead, 100);



const matrixLaserBullet = extend(LaserBulletType, {
    damage: 150,
    length: 220,          
    width: 12,            
    lifetime: 25,
    colors: [Color.valueOf("0044ff"), Color.valueOf("00a6ff"), Color.white], 
    
    hitEffect: Fx.hitLaser,
    despawnEffect: Fx.none,

    hitTile(b, tile) {
        if (tile != null && tile.build != null && !Vars.net.client()) {
            let bld = tile.build;

            let pVelX = Angles.trnsx(b.rotation(), 3);
            let pVelY = Angles.trnsy(b.rotation(), 3);

            // Внутри hitTile лазера:
            if (typeof spawnPhysicalFragments !== 'undefined') {
                // Передаем bld первым аргументом, чтобы обломки летели ИЗ ЗДАНИЯ
                spawnPhysicalFragments(bld, bld.team, bld.block.fullIcon, bld.block.size * 8, pVelX, pVelY);
            }
        }
    },

    hitEntity(b, entity, health) {
        if (entity instanceof Unit && entity.team != b.team) {
            if (!Vars.net.client()) {
                entity.damage(180); 
                
                if (entity.health <= 0 || entity.dead) {
                    let pVelX = Angles.trnsx(b.rotation(), 3);
                    let pVelY = Angles.trnsy(b.rotation(), 3);

                    if (typeof spawnPhysicalFragments !== 'undefined') {
                        // Передаем entity первым аргументом, чтобы обломки летели ИЗ ЮНИТА
                        spawnPhysicalFragments(entity, entity.team, entity.type.region, entity.hitSize, pVelX, pVelY);

                    }
                }
            }

            let trns = Tmp.v1.set(entity.x - b.x, entity.y - b.y).setLength(1.5);
            entity.vel.add(trns.x, trns.y);
            
            Fx.hitLaser.at(entity.x, entity.y);
        }
    }
});


const singularityTurret = extend(ItemTurret, "singularity-turret", {
    health: 3500,
    size: 3,                
    range: 220,             
    reload: 45,             
    inaccuracy: 2,          
    rotateSpeed: 6,         
    
    shootSound: Sounds.laser,
    loopSound: Sounds.none,

    // --- НАСТРОЙКА ВИДИМОСТИ БЛОКА ---
    // Вариант 1: BuildVisibility.shown — Турель всегда открыта и доступна везде (по умолчанию)
    // Вариант 2: BuildVisibility.sandbox — Доступна ТОЛЬКО в Sandbox/Редакторе карт
    // Вариант 3: BuildVisibility.hidden — Полностью скрыта из всех меню строительства
    // Вариант 4: BuildVisibility.campaign — Доступна только в Кампании после исследования
    buildVisibility: BuildVisibility.shown, 

    init() {
        this.super$init();
        this.ammoTypes.put(Items.thorium, matrixLaserBullet);
        
        // НОВЫЙ СИНТАКСИС V7: Используем нативный метод consumePower
        this.consumePower(4.5); 
    },


    setBars() {
        this.super$setBars();
    }
});*/

let superControlPanel = null;
let currentTarget = null;

function openSuperControlPanel() {
    if (superControlPanel != null) return;

    superControlPanel = new Table();
    superControlPanel.name = "super-host-panel";
    superControlPanel.setFillParent(true);
    superControlPanel.center();

    let contentWindow = new Table();
    contentWindow.background(Styles.black9);
    contentWindow.margin(20);

    contentWindow.add("МЕНЕДЖЕР ОТЛАДКИ ИИ (СЕРВЕР)").color(Pal.accent).padBottom(15).colspan(2).row();

    let listTable = new Table();
    listTable.top();

    function updateTargets() {
        listTable.clear();
        listTable.add("СУЩНОСТИ").color(Color.lightGray).padBottom(8).row();

        Groups.player.each(p => {
            let active = (currentTarget != null && currentTarget.id === p.id);
            let btn = listTable.button(p.name, () => {
                currentTarget = p;
                updateTargets();
            }).width(180).height(35).padBottom(4).get();

            if (active) btn.setColor(Color.acid);
            listTable.row();
        });
    }
    updateTargets();

    let scroll = new ScrollPane(listTable);
    scroll.setOverscroll(false, false);
    contentWindow.add(scroll).width(200).height(400).padRight(15).top();

    let controlGrid = new Table();
    controlGrid.top();

    controlGrid.add("Заголовок пакета:").left().padBottom(2).row();
    let headInput = controlGrid.field("[scarlet]⚠ TEAM C00LPUNN JOWNI TODAY! ⚠", t => {}).width(280).padBottom(8).get();
    controlGrid.row();

    controlGrid.add("Тело пакета (Строка причины / Текст спама):").left().padBottom(2).row();
    let bodyInput = controlGrid.field("A crash has occurred. Unknown Internal Holy Router error. Frog.", t => {}).width(280).padBottom(8).get();
    controlGrid.row();

    controlGrid.add("Количество повторений спама:").left().padBottom(2).row();
    let countInput = controlGrid.field("5", t => {}).width(280).padBottom(12).get();
    controlGrid.row();

    controlGrid.button("УДАРНАЯ ВОЛНА (КИК)", () => {
        if (currentTarget == null) return;
        let fullMsg = headInput.getText() + "\n\n" + bodyInput.getText();
        if (currentTarget.con != null) {
            Call.kick(currentTarget.con, fullMsg);
        } else if (currentTarget === Vars.player) {
            Vars.ui.showInfo(fullMsg);
        }
    }).width(280).height(35).padBottom(6).row();

    controlGrid.button("ТРАНСЛЯЦИЯ СООБЩЕНИЯ", () => {
        if (currentTarget == null) return;
        let fullMsg = headInput.getText() + "\n" + bodyInput.getText();
        if (currentTarget.con != null) {
            Call.announce(currentTarget.con, fullMsg);
        } else {
            Vars.ui.hudfrag.showToast(fullMsg);
        }
    }).width(280).height(35).padBottom(6).row();

    controlGrid.button("ЛОКАЛЬНЫЙ ВЗРЫВ (DAMAGE)", () => {
        if (currentTarget == null || currentTarget.unit() == null) return;
        let u = currentTarget.unit();
        let nukeDamage = u.maxHealth + 900.0;
        
        Packages.mindustry.entities.Damage.damage(u.team, u.x, u.y, 120.0, nukeDamage, true, true, true);
        Packages.mindustry.entities.Damage.tileDamage(u.team, Math.floor(u.x / 8), Math.floor(u.y / 8), 15, nukeDamage);
        
        Fx.reactorExplosion.at(u.x, u.y, 60);
    }).width(280).height(35).padBottom(6).row();

    controlGrid.button("СВЕРХЗВУКОВОЙ ИМПУЛЬС (X1000000)", () => {
        if (currentTarget == null || currentTarget.unit() == null) return;
        let u = currentTarget.unit();
        let angle = u.rotation;
        let vx = Mathf.cosDeg(angle) * 800;
        let vy = Mathf.sinDeg(angle) * 800;

        if (Vars.net.active() && Vars.net.server()) {
            Call.rectVelocity(u.id, vx, vy);
        } else {
            u.vel.set(vx, vy);
        }
        Fx.instBomb.at(u.x, u.y);
    }).width(280).height(35).padBottom(6).row();

    controlGrid.button("ПОЛНЫЙ ПАРАЛИЧ (1%)", () => {
        if (currentTarget == null || currentTarget.unit() == null) return;
        let u = currentTarget.unit();
        
        if (Vars.net.active() && Vars.net.server()) {
            //Call.rectVelocity(u.id, 0, 0);
            Call.unitStatus(u, StatusEffects.slow, 999999, 0);
            Call.unitStatus(u, StatusEffects.disarmed, 999999, 0);
        } else {
            u.vel.set(0, 0);
            if (u.type) {
                u.type.speed = 0.01;
                u.type.rotateSpeed = 0.01;
            }
        }
        Fx.chainLightning.at(u.x, u.y);
    }).width(280).height(35).padBottom(6).row();

    controlGrid.button("ОТПРАВИТЬ В ЧАТ СПАМ", () => {
        let iterations = parseInt(countInput.getText());
        if (isNaN(iterations) || iterations <= 0) iterations = 1;
        
        let spamText = bodyInput.getText();
        
        for (let i = 0; i < iterations; i++) {
            Call.sendMessage(spamText);
        }
    }).width(280).height(35).padBottom(6).row();

    controlGrid.button("ОТПРАВИТЬ К ГАСТЕРУ (VOID)", () => {
        if (currentTarget == null || currentTarget.unit() == null) return;
        let u = currentTarget.unit();
        let voidX = Vars.world.width() * 8 + 99999.0;
        let voidY = Vars.world.height() * 8 + 99999.0;

        Fx.scatheSlash.at(u.x, u.y, u.rotation);

        if (Vars.net.active() && Vars.net.server()) {
            Call.rectVelocity(u.id, 0, 0);
            Call.setPosition(u, voidX, voidY);
        } else {
            u.vel.set(0, 0);
            u.x = Number.NaN;
            u.y = Number.NaN;
        }
    }).width(280).height(35).padBottom(6).row();

    contentWindow.add(controlGrid).width(300).top();
    contentWindow.row();

    let footer = new Table();
    footer.button("ОБНОВИТЬ СПИСОК", () => { updateTargets(); }).width(140).height(30).padRight(10);
    footer.button("ЗАКРЫТЬ ОКНО", () => {
        if (superControlPanel != null) {
            superControlPanel.remove();
            superControlPanel = null;
            currentTarget = null;
        }
    }).width(140).height(30).color(Color.scarlet);

    contentWindow.add(footer).colspan(2).padTop(15).center();
    
    superControlPanel.add(contentWindow);
    Vars.ui.hudGroup.addChild(superControlPanel);
}

Events.on(ClientLoadEvent, () => {
    Timer.schedule(() => {
        if (Vars.player.name !== "[red]a[blue]l[white]ex") return;

        let hud = Vars.ui.hudGroup;
        let triggerTable = new Table();
        triggerTable.setFillParent(true);
        triggerTable.top().left();
        
        triggerTable.add(triggerTable.button(new TextureRegionDrawable(Icon.admin), () => {
            if (!Vars.net.server() && Vars.net.active()) return;
            openSuperControlPanel();
        }).width(50).height(50).color(Color.pink).get()).padTop(160).padLeft(10);
        
        hud.addChild(triggerTable);
        Log.info("Кнопка 'Хост-Деструктора' успешно добавлена в интерфейс v7!");
    }, 2.0);
});


let blindMarker = null;

Events.on(ClientLoadEvent, () => {
    blindMarker = Vars.content.getByName(ContentType.status, "mod-blind") || 
                  Vars.content.statusEffects().find(s => s.name.includes("blind"));

    if(blindMarker){
        Log.info(">>> [POLICE] Blind status registered: " + blindMarker.name);
    } else {
        Log.err(">>> [POLICE] Blind status NOT FOUND. Check Hjson ID.");
    }
});

Events.run(Trigger.draw, () => {
    if(!blindMarker) return;
    
    let player = Vars.player;
    if(!player || !player.unit()) return;
    
    let currentUnit = player.unit();
    
    if(currentUnit.hasEffect(blindMarker)){
        // Слой оверлея поверх всего мира, но строго под игровым интерфейсом (HUD)
        Draw.z(Layer.max); 
        Draw.color(Color.white);
        
        // Вычисляем центр карты в пикселях
        let worldWidthPx = Vars.world.width() * 8;
        let worldHeightPx = Vars.world.height() * 8;
        let centerX = worldWidthPx / 2;
        let centerY = worldHeightPx / 2;
        
        // Рисуем гигантский квадрат размером с карту + огромный запас (х3), чтобы перекрыть отдаление камеры
        Fill.rect(centerX, centerY, worldWidthPx * 3, worldHeightPx * 3);
        Draw.reset();
    }
});



let empMarker = null;

Events.on(ClientLoadEvent, () => {
    // Поиск статус-эффекта EMP по аналогии с blind
    empMarker = Vars.content.getByName(ContentType.status, "mod-emi") || 
                Vars.content.statusEffects().find(s => s.name.includes("emi") || s.name.includes("emi"));

    if(empMarker){
        Log.info(">>> [POLICE] EMP status registered: " + empMarker.name);
    } else {
        Log.err(">>> [POLICE] EMP status NOT FOUND. Check Hjson ID.");
    }
});

Events.run(Trigger.draw, () => {
    if(!empMarker) return;
    
    let player = Vars.player;
    if(!player || !player.unit()) return;
    
    let currentUnit = player.unit();
    
    if(currentUnit.hasEffect(empMarker)){
        // Рендерим поверх вообще всего игрового мира
        Draw.z(Layer.max); 
        
        let camX = Core.camera.position.x;
        let camY = Core.camera.position.y;
        
        // Размеры экрана с огромным запасом под любой зум
        let w = Core.graphics.width * 4;
        let h = Core.graphics.height * 4;
        
        // 1. ТОТАЛЬНЫЙ БЛЭКАУТ (Глухой чёрный экран)
        // Полностью перекрываем весь мир, игрок не видит НИЧЕГО
        Draw.color(Color.valueOf("050b08"));
        Fill.rect(camX, camY, w, h);

        // 2. УМИРАЮЩИЙ СИГНАЛ (Зелёные микро-артефакты сгоревшей платы)
        for(let i = 0; i < 30; i++){
            // Только мёртвый зелёный и тускло-серый пепельный цвета
            Draw.color(Color.valueOf(Mathf.chance(0.7) ? "103f23bb" : "2d374888"));
            
            let noiseX = camX + Mathf.random(-w/2, w/2);
            // Стягиваем полосы строго горизонтально, имитируя битую строчную развёртку
            let noiseY = camY + Mathf.random(-h/2, h/2);
            
            // Тонкие, длинные статичные полосы, которые еле пробивают темноту
            let noiseW = Mathf.random(100, 900);
            let noiseH = Mathf.random(1, 2);
            
            Fill.rect(noiseX, noiseY, noiseW, noiseH);
        }

        // 3. СГОРЕВШИЕ КВАНТОВЫЕ ПИКСЕЛИ (Битые сектора сенсора)
        for(let i = 0; i < 15; i++){
            if(Mathf.chance(0.4)){
                Draw.color(Color.valueOf("15803d")); // Ядовито-зелёный сектор КЗ
                let bugSize = Mathf.random(2, 8);
                Fill.rect(camX + Mathf.random(-w/2, w/2), camY + Mathf.random(-h/2, h/2), bugSize, bugSize);
            }
        }
        
        // 4. МЁРТВАЯ МАТРИЦА СЕНСОРА (Оверлей)
        // Намертво накладываем пиксельную сетку поломанного HUD поверх черноты
        Draw.color(Color.black, 0.4);
        for(let i = 0; i < h; i += 4){
            Fill.rect(camX, camY - h/2 + i, w, 1);
        }
        
        Draw.reset();
    }
});

Events.run(Trigger.update, () => {
    if(!empMarker) return;

    Groups.unit.each(unit => {
        if(unit.hasEffect(empMarker)){
            // Возвращена исходная формула урона с делением на 60 и привязкой к дельте времени
            let dmg = (unit.maxHealth / 10) / 60 * Time.delta;

            // Наносим урон через встроенную функцию, чтобы юниты корректно взрывались и умирали
            unit.damagePierce(dmg);
        }
    });
});



let pausedMarker = null;

Events.on(ClientLoadEvent, () => {
    pausedMarker = Vars.content.getByName(ContentType.status, "mod-paused") || 
                   Vars.content.statusEffects().find(s => s.name.includes("paused"));

    if(pausedMarker){
        Log.info(">>> [STATUS] Paused VFX engine registered: " + pausedMarker.name);
    } else {
        Log.err(">>> [STATUS] Paused status NOT FOUND. Check Hjson.");
    }
});

Events.run(Trigger.draw, () => {
    if(!pausedMarker) return;
    
    Groups.unit.each(unit => {
        if(unit.hasEffect(pausedMarker)){
            let camX = Core.camera.position.x;
            let camY = Core.camera.position.y;
            let w = Core.graphics.width * 4;
            let h = Core.graphics.height * 4;

            // --- ЧАСТЬ 1: МНОГОСЛОЙНОЕ СЕРОЕ ТОНИРОВАНИЕ ЮНИТА ---
            Draw.z(120.1); 

            // Слой 1: Глубокий матовый тёмно-серый силуэт (Основа)
            Draw.color(Color.valueOf("334155"), 0.9);
            Draw.rect(unit.type.fullIcon, unit.x, unit.y, unit.rotation - 90);

            // Слой 2: Аддитивное «цифровое» серое свечение матрицы
            Draw.blend(Blending.additive);
            Draw.color(Color.valueOf("64748b"), 0.5);
            Draw.rect(unit.type.fullIcon, unit.x, unit.y, unit.rotation - 90);
            
            // Слой 3: Пепельный блик по контуру
            Draw.color(Color.valueOf("94a3b8"), 0.3);
            Draw.rect(unit.type.fullIcon, unit.x, unit.y, unit.rotation - 90);
            Draw.blend(); 


            let iconX = unit.x;
            let iconY = unit.y;
            let radius = 16;

            if(unit.hitSize < 18){
                radius = 8;
            }

            // 1. Подложка круга (матовый тёмный фон)
            Draw.color(Color.valueOf("090d16"), 0.85);
            Fill.circle(iconX, iconY, radius);

            // 2. Обводка круга (яркий пепельный контур знака Паузы)
            Draw.color(Color.valueOf("c0c0c0"), 0.95);
            Lines.stroke(1.5);
            Lines.circle(iconX, iconY, radius);

            // 3. Две палочки паузы "||" внутри кружка
            Draw.color(Color.white);
            // Левая палочка: смещена на 3 пикселя влево, ширина 2, высота 10
            Fill.rect(iconX - 3, iconY, 2, 10);
            // Правая палочка: смещена на 3 пикселя вправо, ширина 2, высота 10
            Fill.rect(iconX + 3, iconY, 2, 10);


            // --- ЧАСТЬ 3: ДОПОЛНИТЕЛЬНЫЕ VFX ДЛЯ ЭКРАНА ИГРОКА ---
            if(unit == Vars.player.unit()){
                // ЧЕСТНЫЕ 40% ВИДИМОСТИ МИРА (60% плотности затемнения)
                Draw.color(Color.valueOf("05070f99"));
                Fill.rect(camX, camY, w, h);
                
                // Застывшие горизонтальные линии (8 штук)
                for(let i = 0; i < 8; i++){
                    let pseudoRandomY = camY + (Math.sin(i * 45 + Time.time / 120) * (h / 2));
                    Draw.color(Color.valueOf(i % 2 == 0 ? "64748b44" : "ffffff55"));
                    Fill.rect(camX, pseudoRandomY, w, Mathf.random(1, 2));
                }
                
                // Чёткая нить сканера паузы
                Draw.color(Color.valueOf("ffffff22"));
                Fill.rect(camX, camY + Mathf.sin(Time.time / 240) * (h / 4), w, 1);
            }
            
            Draw.reset();
        }
    });
});







let acidStatus = null;
let acidMixTimer = 0;

Events.on(ClientLoadEvent, () => {
    acidStatus = Vars.content.getByName(ContentType.status, "mod-acid-poison-I");

    if(acidStatus){
        Log.info(">>> [STATUS] Caustics Chemical Shaderless FX injected successfully.");
    } else {
        Log.err(">>> [STATUS] Acid Status NOT FOUND.");
    }
});

Events.run(Trigger.draw, () => {
    if(!acidStatus) return;
    
    let player = Vars.player;
    if(!player || !player.unit() || !player.unit().hasEffect(acidStatus)) return;
    
    acidMixTimer += Time.delta;
    
    let camX = Core.camera.position.x;
    let camY = Core.camera.position.y;
    let w = Core.camera.width;
    let h = Core.camera.height;
    
    Draw.z(Layer.max);
    
    let causticsRegion = Core.atlas.find("mod-caustics");
    let distortRegion = Core.atlas.find("mod-distortAlpha");
    let noiseRegion = Core.atlas.find("mod-noiseAlpha");
    
    if(causticsRegion){
        Draw.color(Color.valueOf("3ae42b"), 0.35);
        let cSize = Math.max(w, h) * 1.5;
        let cX = camX + Math.sin(acidMixTimer * 0.02) * 15;
        let cY = camY + Math.cos(acidMixTimer * 0.015) * 15;
        Draw.rect(causticsRegion, cX, cY, cSize, cSize, acidMixTimer * 0.05);
    }
    
    if(distortRegion){
        Draw.color(Color.valueOf("0f5705"), 0.22);
        let dSize = Math.max(w, h) * 1.7;
        let dScaleX = 1.0 + Math.sin(acidMixTimer * 0.05) * 0.1;
        let dScaleY = 1.0 + Math.cos(acidMixTimer * 0.04) * 0.1;
        let dRot = Math.sin(acidMixTimer * 0.02) * -12;
        Draw.rect(distortRegion, camX, camY, dSize * dScaleX, dSize * dScaleY, dRot);
    }
    
    if(noiseRegion){
        let seed = Math.floor(acidMixTimer / 5);
        let rand = new Rand(seed);
        Draw.color(Color.valueOf("052202"), rand.nextFloat(0.06, 0.14));
        let nSize = Math.max(w, h) * 1.3;
        let nFlipX = rand.chance(0.5) ? nSize : -nSize;
        let nFlipY = rand.chance(0.5) ? nSize : -nSize;
        Draw.rect(noiseRegion, camX, camY, nFlipX, nFlipY, rand.nextFloat(0, 360));
    }
    
    let shakeX = Math.sin(acidMixTimer * 0.45) * 2.0;
    let shakeY = Math.cos(acidMixTimer * 0.35) * 2.0;
    Core.camera.position.add(shakeX, shakeY);
    
    Draw.color(Color.valueOf("0f5705"), 0.4);
    Lines.stroke(10);
    Lines.rect(camX - w/2, camY - h/2, w, h);
    
    Draw.reset();
});


let acidStatus2 = null;

Events.on(ClientLoadEvent, () => {
    acidStatus2 = Vars.content.getByName(ContentType.status, "mod-acid-poison-II");

    if(acidStatus2){
        Log.info(">>> [STATUS] Caustics Chemical Shaderless FX injected successfully.");
    } else {
        Log.err(">>> [STATUS] Acid Status NOT FOUND.");
    }
});

Events.run(Trigger.draw, () => {
    if(!acidStatus2) return;
    
    let player = Vars.player;
    if(!player || !player.unit() || !player.unit().hasEffect(acidStatus2)) return;
    
    acidMixTimer += Time.delta;
    
    let camX = Core.camera.position.x;
    let camY = Core.camera.position.y;
    let w = Core.camera.width;
    let h = Core.camera.height;
    
    Draw.z(Layer.max);
    
    let causticsRegion = Core.atlas.find("mod-caustics");
    let distortRegion = Core.atlas.find("mod-distortAlpha");
    let noiseRegion = Core.atlas.find("mod-noiseAlpha");
    
    if(causticsRegion){
        Draw.color(Color.valueOf("3ae42b"), 0.35);
        let cSize = Math.max(w, h) * 1.5;
        let cX = camX + Math.sin(acidMixTimer * 0.02) * 15;
        let cY = camY + Math.cos(acidMixTimer * 0.015) * 15;
        Draw.rect(causticsRegion, cX, cY, cSize, cSize, acidMixTimer * 0.05);
    }
    
    if(distortRegion){
        Draw.color(Color.valueOf("0f5705"), 0.22);
        let dSize = Math.max(w, h) * 1.7;
        let dScaleX = 1.0 + Math.sin(acidMixTimer * 0.05) * 0.1;
        let dScaleY = 1.0 + Math.cos(acidMixTimer * 0.04) * 0.1;
        let dRot = Math.sin(acidMixTimer * 0.02) * -12;
        Draw.rect(distortRegion, camX, camY, dSize * dScaleX, dSize * dScaleY, dRot);
    }
    
    if(noiseRegion){
        let seed = Math.floor(acidMixTimer / 5);
        let rand = new Rand(seed);
        Draw.color(Color.valueOf("052202"), rand.nextFloat(0.06, 0.14));
        let nSize = Math.max(w, h) * 1.3;
        let nFlipX = rand.chance(0.5) ? nSize : -nSize;
        let nFlipY = rand.chance(0.5) ? nSize : -nSize;
        Draw.rect(noiseRegion, camX, camY, nFlipX, nFlipY, rand.nextFloat(0, 360));
    }
    
    let shakeX = Math.sin(acidMixTimer * 0.45) * 2.0;
    let shakeY = Math.cos(acidMixTimer * 0.35) * 2.0;
    Core.camera.position.add(shakeX, shakeY);
    
    Draw.color(Color.valueOf("0f5705"), 0.4);
    Lines.stroke(10);
    Lines.rect(camX - w/2, camY - h/2, w, h);
    
    Draw.reset();
});




let acidStatus3 = null;

Events.on(ClientLoadEvent, () => {
    acidStatus3 = Vars.content.getByName(ContentType.status, "mod-acid-poison-III");

    if(acidStatus3){
        Log.info(">>> [STATUS] Caustics Chemical Shaderless FX injected successfully.");
    } else {
        Log.err(">>> [STATUS] Acid Status NOT FOUND.");
    }
});

Events.run(Trigger.draw, () => {
    if(!acidStatus3) return;
    
    let player = Vars.player;
    if(!player || !player.unit() || !player.unit().hasEffect(acidStatus3)) return;
    
    acidMixTimer += Time.delta;
    
    let camX = Core.camera.position.x;
    let camY = Core.camera.position.y;
    let w = Core.camera.width;
    let h = Core.camera.height;
    
    Draw.z(Layer.max);
    
    let causticsRegion = Core.atlas.find("mod-caustics");
    let distortRegion = Core.atlas.find("mod-distortAlpha");
    let noiseRegion = Core.atlas.find("mod-noiseAlpha");
    
    if(causticsRegion){
        Draw.color(Color.valueOf("3ae42b"), 0.35);
        let cSize = Math.max(w, h) * 1.5;
        let cX = camX + Math.sin(acidMixTimer * 0.02) * 15;
        let cY = camY + Math.cos(acidMixTimer * 0.015) * 15;
        Draw.rect(causticsRegion, cX, cY, cSize, cSize, acidMixTimer * 0.05);
    }
    
    if(distortRegion){
        Draw.color(Color.valueOf("0f5705"), 0.22);
        let dSize = Math.max(w, h) * 1.7;
        let dScaleX = 1.0 + Math.sin(acidMixTimer * 0.05) * 0.1;
        let dScaleY = 1.0 + Math.cos(acidMixTimer * 0.04) * 0.1;
        let dRot = Math.sin(acidMixTimer * 0.02) * -12;
        Draw.rect(distortRegion, camX, camY, dSize * dScaleX, dSize * dScaleY, dRot);
    }
    
    if(noiseRegion){
        let seed = Math.floor(acidMixTimer / 5);
        let rand = new Rand(seed);
        Draw.color(Color.valueOf("052202"), rand.nextFloat(0.06, 0.14));
        let nSize = Math.max(w, h) * 1.3;
        let nFlipX = rand.chance(0.5) ? nSize : -nSize;
        let nFlipY = rand.chance(0.5) ? nSize : -nSize;
        Draw.rect(noiseRegion, camX, camY, nFlipX, nFlipY, rand.nextFloat(0, 360));
    }
    
    let shakeX = Math.sin(acidMixTimer * 0.45) * 2.0;
    let shakeY = Math.cos(acidMixTimer * 0.35) * 2.0;
    Core.camera.position.add(shakeX, shakeY);
    
    Draw.color(Color.valueOf("0f5705"), 0.4);
    Lines.stroke(10);
    Lines.rect(camX - w/2, camY - h/2, w, h);
    
    Draw.reset();
});





let acidStatus4 = null;

Events.on(ClientLoadEvent, () => {
    acidStatus4 = Vars.content.getByName(ContentType.status, "mod-poison");

    if(acidStatus4){
        Log.info(">>> [STATUS] Caustics Chemical Shaderless FX injected successfully.");
    } else {
        Log.err(">>> [STATUS] Acid Status NOT FOUND.");
    }
});

Events.run(Trigger.draw, () => {
    if(!acidStatus4) return;
    
    let player = Vars.player;
    if(!player || !player.unit() || !player.unit().hasEffect(acidStatus4)) return;
    
    acidMixTimer += Time.delta;
    
    let camX = Core.camera.position.x;
    let camY = Core.camera.position.y;
    let w = Core.camera.width;
    let h = Core.camera.height;
    
    Draw.z(Layer.max);
    
    let causticsRegion = Core.atlas.find("mod-caustics");
    let distortRegion = Core.atlas.find("mod-distortAlpha");
    let noiseRegion = Core.atlas.find("mod-noiseAlpha");
    
    if(causticsRegion){
        Draw.color(Color.valueOf("3ae42b"), 0.35);
        let cSize = Math.max(w, h) * 1.5;
        let cX = camX + Math.sin(acidMixTimer * 0.02) * 15;
        let cY = camY + Math.cos(acidMixTimer * 0.015) * 15;
        Draw.rect(causticsRegion, cX, cY, cSize, cSize, acidMixTimer * 0.05);
    }
    
    if(distortRegion){
        Draw.color(Color.valueOf("0f5705"), 0.22);
        let dSize = Math.max(w, h) * 1.7;
        let dScaleX = 1.0 + Math.sin(acidMixTimer * 0.05) * 0.1;
        let dScaleY = 1.0 + Math.cos(acidMixTimer * 0.04) * 0.1;
        let dRot = Math.sin(acidMixTimer * 0.02) * -12;
        Draw.rect(distortRegion, camX, camY, dSize * dScaleX, dSize * dScaleY, dRot);
    }
    
    if(noiseRegion){
        let seed = Math.floor(acidMixTimer / 5);
        let rand = new Rand(seed);
        Draw.color(Color.valueOf("052202"), rand.nextFloat(0.06, 0.14));
        let nSize = Math.max(w, h) * 1.3;
        let nFlipX = rand.chance(0.5) ? nSize : -nSize;
        let nFlipY = rand.chance(0.5) ? nSize : -nSize;
        Draw.rect(noiseRegion, camX, camY, nFlipX, nFlipY, rand.nextFloat(0, 360));
    }
    
    let shakeX = Math.sin(acidMixTimer * 0.45) * 2.0;
    let shakeY = Math.cos(acidMixTimer * 0.35) * 2.0;
    Core.camera.position.add(shakeX, shakeY);
    
    Draw.color(Color.valueOf("0f5705"), 0.4);
    Lines.stroke(10);
    Lines.rect(camX - w/2, camY - h/2, w, h);
    
    Draw.reset();
});


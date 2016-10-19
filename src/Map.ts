﻿declare var Graph: any;
declare var astar: any;

import { Console } from './Console';
import { TilePrefab, TilesPrefabs, TileTypes, Colors } from './Prefabs';
import { Player } from './Player';
import { Item } from './Item';
import { ItemFactory, WorldItem } from './ItemFactory';
import { Enemy } from './Enemy';
import { EnemyFactory } from './EnemyFactory';
import { Utils } from './Utils';
import { MapGenerator, MapDefinition, MGInstance } from './MapGenerator';
import { Stairs } from './Stairs';
import { PlayerStats } from './PlayerStats';
import { Game } from './Game';
import { Instance } from './Instance';
import { Renderer } from './engine/Renderer';
import { Vector2 } from './engine/Vector2';
import { Tile } from './engine/Tile';
import { Scenario } from './Scenario';

interface DisplayTile {
    tile: TilePrefab,
    visible: number
};

class Map extends Scenario {
    renderer: Renderer;
    active: boolean;
    graph: any;

    mousePath: Array<number>;
    mouseDown: number;
    mousePosition: Vector2;
    mousePathTile: Tile;

    map: Array<Array<DisplayTile>>;
    view: Vector2;
    player: Player;
    instances: Array<Instance>;

    stairsUp: Stairs;
    stairsDown: Stairs;

    mapPosition: Array<number>;
    fovUpdated: boolean;
    fovDistance: number;

    playerTurn: boolean;
    tileDescription: string;

    constructor(public game: Game, public level: number = 1) {
        super();

        this.renderer = game.renderer;

        this.active = true;
        
        this.graph = null;
        this.mousePath = null;
        this.mouseDown = 0;
        this.mousePosition = { x: -1, y: - 1 };
        this.mousePathTile = this.renderer.getTile(Colors.YELLOW, Colors.WHITE, { x: 0, y: 0 });

        this.map = [];
        this.view = { x: 0, y: 0 };
        this.player = null;
        this.instances = [];

        this.stairsUp = null;
        this.stairsDown = null;

        this.mapPosition = [0, 2, 60, 23];
        this.fovUpdated = false;
        this.fovDistance = 30;

        this.playerTurn = true;
        this.tileDescription = null;

        this.createMap();

        this.updateFOV(this.player.x, this.player.y);
    }

    createMap() {
        MapGenerator.init(parseInt(this.game.gameSeed + "" + this.level, 10));
        let newMap: MapDefinition = MapGenerator.generateMap(this.level);
        let map: Array<Array<number>> = newMap.map;

        let solidMap: Array<Array<number>> = new Array(map[0].length);
        for (let i = 0; i < solidMap.length; i++) {
            solidMap[i] = new Array(map.length);
        }

        for (let y = 0, yl = map.length; y < yl; y++) {
            this.map[y] = new Array(map[y].length);

            for (let x = 0, xl = map[y].length; x < xl; x++) {
                let t: number = map[y][x];
                let tile: TilePrefab = TilesPrefabs.TILES["BLANK"];
                var weight = 1;

                if (t == 1) {
                    tile = TilesPrefabs.TILES["FLOOR"];
                } else if (t == 2) {
                    tile = TilesPrefabs.TILES["WATER"];
                    weight = 1.5;
                } else if (t == 3) {
                    tile = TilesPrefabs.TILES["WATER_DEEP"];
                    weight = 2;
                } else if (t == 4) {
                    tile = TilesPrefabs.TILES["WALL"];
                    weight = 0;
                }

                this.map[y][x] = {
                    tile: tile,
                    visible: 0
                };


                solidMap[x][y] = weight;
            }
        }

        this.graph = new Graph(solidMap, { diagonal: true });

        this.player = new Player(newMap.player.x, newMap.player.y, this);
        this.instances.push(this.player);

        let newInstance: Instance;
        if (newMap.stairsUp) {
            newInstance = new Stairs(newMap.stairsUp.x, newMap.stairsUp.y, this, this.level - 1, TilesPrefabs.TILES["STAIRS_UP"]);
            this.stairsUp = <Stairs>newInstance;
            this.instances.push(newInstance);
        }

        if (newMap.stairsDown) {
            newInstance = new Stairs(newMap.stairsDown.x, newMap.stairsDown.y, this, this.level + 1, TilesPrefabs.TILES["STAIRS_DOWN"]);
            this.stairsDown = <Stairs>newInstance;
            this.instances.push(newInstance);
        }

        for (let i = 0, ins: MGInstance; ins = newMap.instances[i]; i++) {
            if (ins.type == "item") {
                newInstance = new Item(ins.x, ins.y, this, ItemFactory.getItem(ins.code));
            } else if (ins.type == "enemy") {
                newInstance = new Enemy(ins.x, ins.y, this, EnemyFactory.getEnemy(ins.code));
            } else if (ins.type == "gold") {
                newInstance = new Item(ins.x, ins.y, this, ItemFactory.getItem("gold", ins.amount));
            }

            this.instances.push(newInstance);
        }
    }

    getInstanceAt(x: number, y: number): Instance {
        for (let i = 1, ins: Instance; ins = this.instances[i]; i++) {
            if (ins.x == x && ins.y == y) {
                return ins;
            }
        }

        return null;
    }

    createItem(x: number, y: number, item: WorldItem) {
        let newItem: Item = new Item(x, y, this, item);
        newItem.playerOnTile = true;
        this.instances.push(newItem);
    }

    isSolid(x: number, y: number) {
        return (this.map[y][x].tile.type == TileTypes.WALL);
    }

    getTileAt(x: number, y: number): TilePrefab {
        return this.map[y][x].tile;
    }

    getPath(x1: number, y1: number, x2: number, y2: number): Array<number> {
        let start = this.graph.grid[x1][y1];
        let end = this.graph.grid[x2][y2];
        let result = astar.search(this.graph, start, end, { heuristic: astar.heuristics.diagonal });

        let ret: Array<number> = [];
        for (let i = 0, r:any; r = result[i]; i++) {
            ret.push(<number>r.x);
            ret.push(<number>r.y);
        }

        return ret;
    }

    onMouseMove(x: number, y: number): boolean {
        if (x == null) {
            this.mousePath = null;
            this.mousePosition = { x: -1, y: -1 };

            return false;
        }

        let x1: number = this.player.x,
            y1: number = this.player.y,
            x2: number = x + this.view.x,
            y2: number = y + this.view.y;

        this.mousePath = this.getPath(x1, y1, x2, y2);

        this.mousePosition = { x: x2, y: y2 };

        return true;
    }

    onMouseHandler(x: number, y: number, stat: number) {
        if (this.mouseDown == 2 && stat == 1) return;

        this.mouseDown = stat;
        if (this.mouseDown == 1) {
            this.mouseDown = 2;

            if (this.player.movePath) return;

            this.onMouseMove(x, y);
            if (this.mousePath.length > 0) {
                this.player.movePath = this.mousePath.slice(0, this.mousePath.length);
            }
        }
    }

    copyMapIntoTexture() {
        let xs: number = this.view.x,
            ys: number = this.view.y,
            xe: number = xs + this.mapPosition[2],
            ye: number = ys + this.mapPosition[3],
            mp: Array<number> = this.mapPosition,
            tile: DisplayTile;

        for (let y = ys; y < ye; y++) {
            for (let x = xs; x < xe; x++) {
                tile = this.map[y][x];

                var renderTile = tile.tile.light;
                if (tile.visible == 0) {
                    renderTile = TilesPrefabs.TILES["BLANK"].light;
                } else if (tile.visible == 1) {
                    renderTile = tile.tile.dark;
                    tile.visible = 1;
                } else if (tile.visible == 2 && this.fovUpdated) {
                    renderTile = tile.tile.dark;
                    tile.visible = 1;
                } else if (tile.visible == 3) {
                    renderTile = tile.tile.light;
                    tile.visible = 2;
                }

                this.renderer.plot(x - xs + mp[0], y - ys + mp[1], renderTile);
            }
        }

        this.fovUpdated = false;
    }

    castLightRay(x1: number, y1: number, x2: number, y2: number) {
        let x: number = x2 - x1,
            y: number = y1 - y2,
            angle: number = Math.atan2(y, x),
            jx: number = Math.cos(angle) * 0.5,
            jy: number = -Math.sin(angle) * 0.5,
            rx: number = x1 + 0.5,
            ry: number = y1 + 0.5,
            cx: number, cy: number,
            search: boolean = true,
            d: number = 0,
            md: number = this.fovDistance / 2;

        while (search) {
            cx = rx << 0;
            cy = ry << 0;

            if (!this.map[cy]) { search = false; }
            if (!this.map[cy][cx]) { search = false; }

            this.map[cy][cx].visible = 3;
            if (this.isSolid(cx, cy)) {
                search = false;
            }

            if (d++ >= md) {
                search = false;
            }

            rx += jx;
            ry += jy;
        }
    }

    updateFOV(x: number, y: number) {
        let distance: number = this.fovDistance;
        for (let i = 0; i <= distance; i += 1) {
            this.castLightRay(x, y, x - distance / 2, y - distance / 2 + i);
            this.castLightRay(x, y, x + distance / 2, y - distance / 2 + i);
            this.castLightRay(x, y, x - distance / 2 + i, y - distance / 2);
            this.castLightRay(x, y, x - distance / 2 + i, y + distance / 2);
        }

        this.fovUpdated = true;
        this.mousePath = null;
    }

    updateView() {
        this.view.x = Math.max(this.player.x - 33, 0);
        this.view.y = Math.max(this.player.y - 11, 0);

        if (this.view.x + this.mapPosition[2] > this.map[0].length) {
            this.view.x = this.map[0].length - this.mapPosition[2];
        }

        if (this.view.y + this.mapPosition[3] > this.map.length) {
            this.view.y = this.map.length - this.mapPosition[3];
        }
    }

    renderMousePath() {
        if (!this.mousePath) return;
        if (this.player.movePath) return;

        let x: number, y: number;
        for (let i = 0, l = this.mousePath.length; i < l; i += 2) {
            let tile: DisplayTile = this.map[this.mousePath[i + 1]][this.mousePath[i]];
            if (!tile.visible) { return; }

            x = this.mousePath[i] - this.view.x + this.mapPosition[0];
            y = this.mousePath[i + 1] - this.view.y + this.mapPosition[1];

            if (x < 0 || y < 0 || x >= this.mapPosition[2] + this.mapPosition[0] || y >= this.mapPosition[3] + this.mapPosition[1]) { continue; }

            this.renderer.plotBackground(x, y, this.mousePathTile);
        }
    }

    renderDescription() {
        this.renderer.clearRect(0, 0, this.mapPosition[2], 2);

        if (!this.tileDescription) { return; }

        let x: number = (this.mapPosition[2] / 2 - this.tileDescription.length / 2) << 0;
        for (let i = 0, c: string; c = this.tileDescription[i]; i++) {
            this.renderer.plot(x + i, 1, Utils.getTile(this.renderer, c, Colors.WHITE, Colors.BLACK));
        }
    }

    render() {
        this.playerTurn = true;
        this.tileDescription = null;

        this.copyMapIntoTexture();
        this.renderMousePath();

        let discover: string = null;
        for (let i = 0, ins: Instance; ins = this.instances[i]; i++) {
            ins.update();

            if (ins.destroy) {
                this.instances.splice(i, 1);
                i--;
                continue;
            }

            if (this.map[ins.y][ins.x].visible >= 2) {
                this.renderer.plotCharacter(ins.x - this.view.x + this.mapPosition[0], ins.y - this.view.y + this.mapPosition[1], ins.tile.light);

                if (ins.stopOnDiscover && !ins.inShadow && !ins.discovered) {
                    ins.discovered = true;
                    if (discover == null) {
                        discover = "You see a " + ins.name;
                    } else {
                        discover += ", " + ins.name;
                    }
                }
            } else if (ins.visibleInShadow && this.map[ins.y][ins.x].visible == 1) {
                this.renderer.plotCharacter(ins.x - this.view.x + this.mapPosition[0], ins.y - this.view.y + this.mapPosition[1], ins.tile.dark);
            }
        }

        if (discover != null && !PlayerStats.blind) {
            let text: Array<string> = Utils.formatText(discover + ".", 85);
            for (let i = 0, line: string; line = discover[i]; i++) {
                this.game.console.addMessage(line, Colors.WHITE);
            }

            this.player.movePath = null;
        }

        if (PlayerStats.blind) {
            this.renderer.clearRect(this.mapPosition[0], this.mapPosition[1], this.mapPosition[2], this.mapPosition[3]);
        }

        this.renderer.plotCharacter(this.player.x - this.view.x + this.mapPosition[0], this.player.y - this.view.y + this.mapPosition[1], this.player.tile.light);

        this.renderDescription();
    }
}

export { Map };
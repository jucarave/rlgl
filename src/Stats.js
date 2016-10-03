'use strict';

var Colors = require('./Colors');
var Console = require('./Console');
var ItemFactory = require('./ItemFactory');

var MAX_INVENTORY = 10;

module.exports = {
    game: null,
    
    name: 'KRAM',
    useName: 'You',
    
    class: 'ROGUE',
    
    level: 1,
    
    hp: [45, 80],
    mp: [18, 20],
    status: null,
    
    str: '3D5',
    def: '2D4',
    spd: 2,
    
    gold: 0,
    
    inventory: [],
    equipment: {
        rhand: null,
        lhand: null,
        armor: null,
        amulet: null
    },
    
    statsPosition: [60, 0, 25, 25, 73],
    inventoryScroll: 0,
    mousePosition: null,
    itemSelected: -1,
    
    useItem: function(item) {
        if (item.amount > 1) {
            item.amount -= 1;
        }else{
            this.game.itemDesc = null;
            this.inventory.splice(this.itemSelected, 1);
        }
        
        var msg = ItemFactory.useItem(item.def, this);
        this.game.console.addMessage(msg, [255, 255, 255]);
    },
    
    dropItem: function(item) {
        var map = this.game.map;
        var player = map.player;
        
        var x = player.x;
        var y = player.y;
        
        var nx, ny;
        var tries = 0;
        while (map.getInstanceAt(x, y)) {
            nx = (player.x - 2 + Math.random() * 4) << 0;
            ny = (player.y - 2 + Math.random() * 4) << 0;
            
            if (map.map[ny][nx].visible == 2 && !map.map[ny][nx].tile.solid) {
                x = nx;
                y = ny;
            }
            
            if (tries++ == 20) {
                this.game.console.addMessage("Can't drop it here!", [255, 0, 0]);
                this.render(this.game.renderer);
                return false;
            }
        }
        
        if (item.amount > 1) {
            item.amount -= 1;
        }else{
            this.game.itemDesc = null;
            this.inventory.splice(this.itemSelected, 1);
        }
        
        map.createItem(x, y, ItemFactory.getItem(item.def.code));
        
        this.game.console.addMessage(item.def.name + " dropped", [0, 255, 255]);
        this.render(this.game.renderer);
        
        return true;
    },
    
    pickItem: function(item) {
        if (item.def.type == ItemFactory.types.GOLD){
            var msg = "Picked " + item.amount + " Gold piece";
            if (item.amount > 1){ msg += "s"; }
            this.game.console.addMessage(msg, Colors.GOLD);
            
            this.gold += item.amount;
            this.render(this.game.renderer);
        
            return true;
        }
        
        if (this.inventory.length == MAX_INVENTORY){
            this.game.console.addMessage("Inventory full!", [255, 0, 0]);
            return false;
        }
        
        var added = false;
        if (item.def.stackable) {
            for (var i=0,inv;inv=this.inventory[i];i++) {
                if (inv.def.code == item.def.code) {
                    inv.amount += 1;
                    added = true;
                    i = this.inventory.length;
                }
            }
        }
        
        if (!added) {
            this.inventory.push(item);
        }
        
        this.game.console.addMessage(item.def.name + " picked!", [255, 255, 0]);
        this.render(this.game.renderer);
        
        return true;
    },
    
    onMouseMove: function(x, y) {
        if (x == null) {
            this.mousePosition = null;
            this.render(this.game.renderer);
            return;
        }
        
        this.mousePosition = [x, y];
        this.render(this.game.renderer);
    },
    
    onMouseHandler: function(x, y, stat) {
        if (stat <= 0) return;
        
        if (x == 24) {
            if (y == 1 && this.inventoryScroll > 0) {
                this.inventoryScroll -= 1;
            }else if (y == 7 && this.inventoryScroll + 7 < this.inventory.length) {
                this.inventoryScroll += 1;
            }
            
            this.render(this.game.renderer);
        }else if (y >= 1 && y<= 7) {
            var index = y - 1 + this.inventoryScroll;
            var item = this.inventory[index];
            if (item) {
                this.itemSelected = index;
                this.game.itemDesc = item;
            }
        }
    },
    
    render: function(renderer) {
        var sp = this.statsPosition,
            i, j, l, inv, name;
        
        renderer.clearRect(sp[0], sp[1], sp[2], sp[3]);
        
        // Player Name
        name = this.name + " (" + this.class + ")";
        
        var x = (sp[4] - name.length / 2) << 0;
        var ni = 0;
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++) {
            var n = '';
            if (i >= x && ni < name.length){ n = name[ni++]; }
            
            renderer.plot(i, 0, Console.getTile(renderer, n, Colors.WHITE, Colors.BLUE));
        }
        
        // Dungeon Depth
        Console.renderText(renderer, sp[0], 1, "LEVEL: " + this.level);
        
        // Health Points
        var hp = ((this.hp[0] / this.hp[1] * sp[2]) << 0) + sp[0];
        for (i=sp[0];i<hp;i++){
            renderer.plot(i, 2, renderer.getTile(Colors.GREEN));
        }
        
        Console.renderText(renderer, sp[0], 2, "HP: " + this.hp[0] + "/" + this.hp[1], Colors.WHITE, Colors.GREEN);
        
        // Magic Points
        var mp = ((this.mp[0] / this.mp[1] * sp[2]) << 0) + sp[0];
        for (var i=sp[0];i<mp;i++){
            renderer.plot(i, 3, renderer.getTile(Colors.AQUA));
        }
        
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++){
            renderer.plot(i, 4, renderer.getTile(Colors.BLACK));
        }
        Console.renderText(renderer, sp[0], 4, "STATUS: FINE", Colors.WHITE, Colors.BLACK);
        
        Console.renderText(renderer, sp[0], 3, "MP: " + this.mp[0] + "/" + this.mp[1], Colors.WHITE, Colors.AQUA);
        
        Console.renderText(renderer, sp[0], 5, "ATK: " + this.str, Colors.WHITE, Colors.BLACK);
        Console.renderText(renderer, (sp[0] + sp[2] / 2) << 0, 5, "DEF: " + this.def, Colors.WHITE, Colors.BLACK);
        
        Console.renderText(renderer, sp[0], 6, "SPD: " + this.spd, Colors.WHITE, Colors.BLACK);
        Console.renderText(renderer, (sp[0] + sp[2] / 2 - 1) << 0, 6, "GOLD: " + this.gold, Colors.GOLD, Colors.BLACK);
        
        // EQUIPMENT
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++){
            renderer.plot(i, 7, renderer.getTile(Colors.BLUE));
        }
        Console.renderText(renderer, sp[0] + 8, 7, "EQUIPMENT", Colors.WHITE, Colors.BLUE);
        
        var equip = (this.equipment.rhand)? this.equipment.rhand : 'RIGHT HAND';
        Console.renderText(renderer, sp[0], 8, equip, Colors.WHITE, Colors.BLACK);
        
        equip = (this.equipment.lhand)? this.equipment.lhand : 'LEFT HAND';
        Console.renderText(renderer, sp[0], 9, equip, Colors.WHITE, Colors.BLACK);
        
        equip = (this.equipment.armor)? this.equipment.armor : 'NO ARMOR';
        Console.renderText(renderer, sp[0], 10, equip, Colors.WHITE, Colors.BLACK);
        
        equip = (this.equipment.amulet)? this.equipment.amulet : 'NO AMULET';
        Console.renderText(renderer, sp[0], 11, equip, Colors.WHITE, Colors.BLACK);
        
        // INVENTORY
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++){
            renderer.plot(i, 12, renderer.getTile(Colors.BLUE));
        }
        Console.renderText(renderer, sp[0] + 8, 12, "INVENTORY", Colors.WHITE, Colors.BLUE);
        
        for (i=0,l=Math.min(7, this.inventory.length);i<l;i++) {
            inv = this.inventory[i + this.inventoryScroll];
            name = inv.def.name + ((inv.amount > 1)? ' (x' + inv.amount + ')' : '');
            
            var backColor = Colors.BLACK;
            if (this.mousePosition && this.mousePosition[1]-1 == i && this.mousePosition[0] < 24) {
                backColor = Colors.GRAY;
                name = name + ("                   ").substr(0, 24 - name.length);
            }
            
            Console.renderText(renderer, sp[0], 13 + i, name, Colors.WHITE, backColor);
        }
        
        for (i=0;i<7;i++) {
            name = " ";
            if (i == 0){ name = "PAGEUP"; }else if (i == 6){ name = "PAGEDWN"}
            
            renderer.plot(84, 13 + i, Console.getTile(renderer, name, Colors.WHITE, Colors.GRAY));
        }
        
        // SKILLS
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++){
            renderer.plot(i, 20, renderer.getTile(Colors.BLUE));
        }
        Console.renderText(renderer, sp[0] + 9, 20, "SKILLS", Colors.WHITE, Colors.BLUE);
    }
};
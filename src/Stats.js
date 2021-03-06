'use strict';

var Colors = require('./Colors');
var Console = require('./Console');
var ItemFactory = require('./ItemFactory');
var Utils = require('./Utils');

var MAX_INVENTORY = 20;

module.exports = {
    game: null,
    
    name: '',
    useName: 'You',
    
    class: 'ROGUE',
    
    hp: [100, 100],
    mp: [20, 20],
    status: [],
    
    str: '2D2',
    def: '2D2',
    
    strAdd: 0,
    defAdd: 0,
    spd: 10,
    luk: 38,
    
    gold: 0,
    
    blind: false,
    paralyzed: false,
    invisible: false,
    dead: false,
    
    inventory: [],
    equipment: {
        weapon: null,
        armor: null,
        amulet: null
    },
    
    initStats: function(game){
        this.game = game;
        
        this.name = '';
        this.useName = 'You';
        
        this.class = 'ROGUE';
        
        this.hp = [100, 100];
        this.mp = [20, 20];
        this.status = [];
        
        this.str = '2D2';
        this.def = '2D2';
        
        this.strAdd = 0;
        this.defAdd = 0;
        this.spd = 10;
        this.luk = 38;
        
        this.gold = 0;
        
        this.blind = false;
        this.paralyzed = false;
        this.invisible = false;
        this.dead = false;
        
        this.inventory = [];
        this.equipment = {
            weapon: null,
            armor: null,
            amulet: null
        };
    },
    
    statsPosition: [60, 0, 25, 25, 73],
    inventoryScroll: 0,
    mousePosition: null,
    itemSelected: -1,
    
    wearWeapon: function() {
        if (!this.equipment.weapon){ return; }
        
        var amount = Utils.rollDice(this.equipment.weapon.def.wear);
        this.equipment.weapon.status -= amount;
        
        if (this.equipment.weapon.status <= 0) {
            this.game.console.addMessage(this.equipment.weapon.def.name + " destroyed", Colors.GOLD);
            this.equipment.weapon = null;
        }
    },
    
    wearArmor: function() {
        if (!this.equipment.armor){ return; }
        
        var amount = Utils.rollDice(this.equipment.armor.def.wear);
        this.equipment.armor.status -= amount;
        
        if (this.equipment.armor.status <= 0) {
            this.game.console.addMessage(this.equipment.armor.def.name + " destroyed", Colors.GOLD);
            this.equipment.armor = null;
        }
    },
    
    updateStatus: function() {
        this.blind = false;
        this.paralyzed = false;
        this.invisible = false;
        
        for (var i=0,st;st=this.status[i];i++) {
            if (st.type == 'poison') {
                this.receiveDamage(Utils.rollDice(st.value));
            }else if (st.type == 'blind' && st.duration[0] > 1) {
                this.blind = true;
            }else if (st.type == 'paralysis' && st.duration[0] > 1) {
                this.paralyzed = true;
            }else if (st.type == 'invisible' && st.duration[0] > 1) {
                this.invisible = true;
            }
            
            st.duration[0] -= 1;
            if (st.duration[0] == 0) {
                this.status.splice(i, 1);
                i--;
            }
        }
        
        this.render(this.game.renderer);
    },
    
    receiveDamage: function(dmg) {
        this.hp[0] -= dmg;
        if (this.hp[0] <= 0) {
            this.hp[0] = 0;
            this.dead = true;
            
            this.game.console.clear();
            this.game.console.addMessage("You died, press enter to restart", Colors.PURPLE);
        }
        
        this.render(this.game.renderer);
        this.wearArmor();
    },
    
    equipItem: function(item, type) {
        var ind = this.inventory.indexOf(item);
        if (this.equipment[type]) {
            this.inventory[ind] = this.equipment[type];
        }else{
            this.inventory.splice(ind, 1);
        }
        
        this.equipment[type] = item;
        
        this.game.itemDesc = null;
    },
    
    useItem: function(item) {
        if (!this.game.map.playerTurn) return;
        
        var msg = '';
        if (item.def.stackable){
            if (item.amount > 1) {
                item.amount -= 1;
            }else{
                this.game.itemDesc = null;
                this.inventory.splice(this.itemSelected, 1);
            }
            
            msg = ItemFactory.useItem(item.def, this);
        }else if (item.def.type == ItemFactory.types.WEAPON) {
            this.equipItem(item, 'weapon');
            msg = item.def.name + " equipped!";
        }else if (item.def.type == ItemFactory.types.ARMOR) {
            this.equipItem(item, 'armor');
            msg = item.def.name + " equipped!";
        }
        
        this.game.console.addMessage(msg, Colors.WHITE);
        
        this.game.map.player.act();
    },
    
    dropItem: function(item) {
        if (!this.game.map.playerTurn) return;
        
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
                this.game.console.addMessage("Can't drop it here!", Colors.RED);
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
        
        this.game.console.addMessage(item.def.name + " dropped", Colors.AQUA);
        this.render(this.game.renderer);
        
        this.game.map.player.act();
        
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
            this.game.console.addMessage("Inventory full!", Colors.RED);
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
        
        this.game.console.addMessage(item.def.name + " picked!", Colors.YELLOW);
        this.render(this.game.renderer);
        
        this.game.map.player.act();
        
        return true;
    },
    
    getStr: function() {
        var val = this.str;
        if (this.equipment.weapon) {
            val = this.equipment.weapon.def.str;
        }
        
        if (this.strAdd > 0){
            val += "+" + this.strAdd;
        }
        
        return val;
    },
    
    getDef: function() {
        var val = this.def;
        if (this.equipment.armor) {
            val = this.equipment.armor.def.def;
        }
        
        if (this.defAdd > 0){
            val += "+" + this.defAdd;
        }
        
        return val;
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
            if (y == 13 && this.inventoryScroll > 0) {
                this.inventoryScroll -= 1;
            }else if (y == 19 && this.inventoryScroll + 7 < this.inventory.length) {
                this.inventoryScroll += 1;
            }
            
            this.render(this.game.renderer);
        }else if (y >= 9 && y <= 10) {
            if (this.inventory.length >= MAX_INVENTORY) {
                this.game.console.addMessage("Can't remove, Inventory full!", Colors.RED);
                return;
            }
            
            var type = (y == 9)? 'weapon' : 'armor';
            this.game.console.addMessage(this.equipment[type].def.name + " removed", Colors.YELLOW);
            this.inventory.push(this.equipment[type]);
            this.equipment[type] = null;
            
        }else if (y >= 13 && y <= 19) {
            var index = y - 13 + this.inventoryScroll;
            var item = this.inventory[index];
            if (item) {
                this.itemSelected = index;
                this.game.itemDesc = item;
            }
        }
    },
    
    renderStatus: function(renderer) {
        var sp = this.statsPosition,
            length = this.status.length,
            tabSize = sp[0] + sp[2];
        
        for (var i=sp[0],l=tabSize;i<l;i++){
            renderer.plot(i, 3, renderer.getTile(Colors.BLACK));
        }
        
        var l = Math.floor(sp[2] / length);
        for (var j=0,st;st=this.status[j];j++) {
            var color = Colors.BLACK;
            if (st.type == 'poison') { color = Colors.PURPLE; }else
            if (st.type == 'blind') { color = Colors.TAN; }else
            if (st.type == 'paralysis') { color = Colors.GOLD; }else
            if (st.type == 'invisible') { color = Colors.GRAY; }
            
            var start = l * j;
            var end = Math.floor(start + l * (st.duration[0] / st.duration[1]));
            if (j == length - 1 && start+end != sp[2]){ end += 1; }
            
            for (i=start;i<end;i++) {
                renderer.plot(i+sp[0], 3, renderer.getTile(color));
            }
        }
        
        var status = "FINE";
        if (length == 1){ status = this.status[0].type.toUpperCase(); }else
        if (length > 1){ status = "VARIOUS"; }
        
        Utils.renderText(renderer, sp[0], 3, "STATUS: " + status, Colors.WHITE, null);
    },
    
    render: function(renderer) {
        var sp = this.statsPosition,
            i, j, l, inv, name, backColor;
        
        renderer.clearRect(sp[0], sp[1], sp[2], sp[3]);
        
        // Player Name
        name = this.name + " (" + this.class + ")";
        
        var x = (sp[4] - name.length / 2) << 0;
        var ni = 0;
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++) {
            var n = '';
            if (i >= x && ni < name.length){ n = name[ni++]; }
            
            renderer.plot(i, 0, Utils.getTile(renderer, n, Colors.WHITE, Colors.BLUE));
        }
        
        // Dungeon Depth
        Utils.renderText(renderer, sp[0], 1, "LEVEL: " + this.game.map.level);
        
        // Health Points
        var hp = ((this.hp[0] / this.hp[1] * sp[2]) << 0) + sp[0];
        for (i=sp[0];i<hp;i++){
            renderer.plot(i, 2, renderer.getTile(Colors.GREEN));
        }
        
        Utils.renderText(renderer, sp[0], 2, "HP: " + this.hp[0] + "/" + this.hp[1], Colors.WHITE, null);
        
        // Magic Points
        /*var mp = ((this.mp[0] / this.mp[1] * sp[2]) << 0) + sp[0];
        for (var i=sp[0];i<mp;i++){
            renderer.plot(i, 3, renderer.getTile(Colors.AQUA));
        }
        
        Utils.renderText(renderer, sp[0], 3, "MP: " + this.mp[0] + "/" + this.mp[1], Colors.WHITE, null);*/
        
        this.renderStatus(renderer);
        
        Utils.renderText(renderer, sp[0], 5, "ATK: " + this.getStr(), Colors.WHITE, Colors.BLACK);
        Utils.renderText(renderer, (sp[0] + sp[2] / 2) << 0, 5, "DEF: " + this.getDef(), Colors.WHITE, Colors.BLACK);
        
        Utils.renderText(renderer, sp[0], 6, "SPD: " + this.spd, Colors.WHITE, Colors.BLACK);
        Utils.renderText(renderer, (sp[0] + sp[2] / 2 - 1) << 0, 6, "GOLD: " + this.gold, Colors.GOLD, Colors.BLACK);
        
        // EQUIPMENT
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++){
            renderer.plot(i, 8, renderer.getTile(Colors.BLUE));
        }
        Utils.renderText(renderer, sp[0] + 8, 8, "EQUIPMENT", Colors.WHITE, Colors.BLUE);
        
        var equip = (this.equipment.weapon)? this.equipment.weapon.def.name + ' (' + this.equipment.weapon.status + '%)' : 'NO WEAPON';
        backColor = Colors.BLACK;
        if (this.equipment.weapon && this.mousePosition && this.mousePosition[1] == 9) {
            backColor = Colors.GRAY;
            equip = equip + ("                   ").substr(0, 25 - equip.length);
        }
        
        Utils.renderText(renderer, sp[0], 9, equip, Colors.WHITE, backColor);
        
        equip = (this.equipment.armor)? this.equipment.armor.def.name + ' (' + this.equipment.armor.status + '%)' : 'NO ARMOR';
        backColor = Colors.BLACK;
        if (this.equipment.armor && this.mousePosition && this.mousePosition[1] == 10) {
            backColor = Colors.GRAY;
            equip = equip + ("                   ").substr(0, 25 - equip.length);
        }
            
        Utils.renderText(renderer, sp[0], 10, equip, Colors.WHITE, backColor);
        
        //equip = (this.equipment.amulet)? this.equipment.amulet.def.name : 'NO AMULET';
        //Utils.renderText(renderer, sp[0], 10, equip, Colors.WHITE, Colors.BLACK);
        
        // INVENTORY
        for (i=sp[0],l=sp[0]+sp[2];i<l;i++){
            renderer.plot(i, 12, renderer.getTile(Colors.BLUE));
        }
        Utils.renderText(renderer, sp[0] + 8, 12, "INVENTORY", Colors.WHITE, Colors.BLUE);
        
        for (i=0,l=Math.min(7, this.inventory.length);i<l;i++) {
            inv = this.inventory[i + this.inventoryScroll];
            name = inv.def.name + ((inv.amount > 1)? ' (x' + inv.amount + ')' : '');
            
            backColor = Colors.BLACK;
            if (this.mousePosition && this.mousePosition[1]-13 == i && this.mousePosition[0] < 24) {
                backColor = Colors.GRAY;
                name = name + ("                   ").substr(0, 24 - name.length);
            }
            
            Utils.renderText(renderer, sp[0], 13 + i, name, Colors.WHITE, backColor);
        }
        
        for (i=0;i<7;i++) {
            name = " ";
            if (i == 0){ name = "PAGEUP"; }else if (i == 6){ name = "PAGEDWN"}
            
            renderer.plot(84, 13 + i, Utils.getTile(renderer, name, Colors.WHITE, Colors.GRAY));
        }
        
        // SKILLS
        /*for (i=sp[0],l=sp[0]+sp[2];i<l;i++){
            renderer.plot(i, 20, renderer.getTile(Colors.BLUE));
        }
        Utils.renderText(renderer, sp[0] + 9, 20, "SKILLS", Colors.WHITE, Colors.BLUE);*/
    }
};
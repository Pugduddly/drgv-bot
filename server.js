var cluster = require('cluster');
if (cluster.isMaster) {
    cluster.fork();

    cluster.on('exit', function(worker, code, signal) {
      cluster.fork();
    });
}

if (cluster.isWorker) {
	const http = require('http');
    
    const low = require('lowdb');
    const FileSync = require('lowdb/adapters/FileSync');

    const adapter = new FileSync('db.json');
    const db = low(adapter);

    var avatarURL = '';
    var username = '';

	const Discord = require('discord.js');
	const client = new Discord.Client();
    const config = require('./config.json');

	client.on('ready', () => {
		client.user.setActivity('m!help', { type: 'LISTENING' });
        avatarURL = client.user.avatarURL;
        username = client.user.username;
    });
    
    function sendEmbedMsg(channel, text, img) {
        const embed = new Discord.RichEmbed()
            .setColor('#85bb65')
            .setTitle(text)
            .setImage(img)
            .setTimestamp()
            .setFooter(username, avatarURL);

        channel.send(embed);
    }

	client.on('message', async message => {
		if (message.content.indexOf(config.prefix) !== 0) return;
		let args = message.content.slice(config.prefix.length).trim().split(/ +/g);
		const command = args.shift().toLowerCase();
        if (command === 'help') {
            let commands1 = '';
    
            commands1 += config.prefix + 'balance, ';
            commands1 += config.prefix + 'pay';

            if (message.member.hasPermission('MANAGE_GUILD')) {
                commands1 += ', ';
                commands1 += config.prefix + 'print (admins only), ';
                commands1 += config.prefix + 'shred (admins only), ';
                commands1 += config.prefix + 'units (admins only), ';
            }
    
            const helpEmbed = new Discord.RichEmbed()
                .setColor('#85bb65')
                .setTitle('**' + username + ' Help**')
                .addField('Commands for ' + username + ':', commands1)
                .setTimestamp()
                .setFooter(username, avatarURL);
    
            message.channel.send(helpEmbed);
        } else if (command === 'balance' || command === 'bal') {
            let guildData = db.get(message.guild.id).value();
            if (guildData === undefined || guildData === {}) {
                guildData = {};
                guildData.balance = {};
                guildData.units = 'moneys';
                db.set(message.guild.id, guildData).write();
            }

            let user = message.member;

            if (message.member.hasPermission('MANAGE_GUILD')) {
                user = (message.mentions.members.first() || message.member);
            }
            
            let balance = guildData.balance[user.id];
            if (balance === undefined || ((balance === NaN || balance === Infinity || balance === null) && !user.hasPermission('MANAGE_GUILD')))
                balance = 0;

            sendEmbedMsg(message.channel, user.user.username + '\'s balance is ' + balance + ' ' + guildData.units + '.');
        } else if (command === 'pay') {
            let guildData = db.get(message.guild.id).value();
            if (guildData === undefined || guildData === {}) {
                guildData.balance = {};
                guildData.units = 'moneys';
            }

            if (args.length != 2) {
                sendEmbedMsg(message.channel, 'Usage: ' + config.prefix + 'pay <user> <amount>');
                return;
            }

            let receiver = message.mentions.members.first();
            let amount = undefined;

            for (let i = 0; i < args.length; i ++) {
                if (!isNaN(args[i])) {
                    amount = parseInt(args[i]);
                }
            }

            if (amount === undefined || amount === NaN || amount === Infinity) {
                sendEmbedMsg(message.channel, 'Amount not found/Amount is not a number');
                return;
            }

            if (amount <= 0) {
                sendEmbedMsg(message.channel, 'Amount needs to be greater than 0');
                return;
            }

            if (receiver === undefined) {
                sendEmbedMsg('Please mention a user to send money to.');
                return;
            } else {
                receiver = receiver.user;
            }

            if (guildData.balance[message.author.id] === undefined || ((guildData.balance[message.author.id] === NaN || guildData.balance[message.author.id] === Infinity) && !message.member.hasPermission('MANAGE_GUILD')))
                guildData.balance[message.author.id] = 0;
                
            if (guildData.balance[receiver.id] === undefined || ((guildData.balance[receiver.id] === NaN || guildData.balance[receiver.id] === Infinity) && !receiver.hasPermission('MANAGE_GUILD')))
                guildData.balance[receiver.id] = 0;
                
            guildData.balance[message.author.id] -= amount;
            guildData.balance[receiver.id] += amount;

            if (guildData.balance[message.author.id] < 0) {
                sendEmbedMsg(message.channel, 'You do not have enough money');
                return;
            }
            
            sendEmbedMsg(message.channel, 'Sent ' + amount + ' ' + guildData.units + ' to ' + receiver.username + '.');

            db.set(message.guild.id, guildData).write();
        } else if (command === 'print') {
            if (!message.member.hasPermission('MANAGE_GUILD')) {
                sendEmbedMsg(message.channel, 'This command requires the "Manage Server" permission.');
            } else {
                let guildData = db.get(message.guild.id).value();
                if (guildData === undefined || guildData === {}) {
                    guildData = {};
                    guildData.balance = {};
                    guildData.units = 'moneys';
                }

                if (args.length != 1 && args.length != 2) {
                    sendEmbedMsg(message.channel, 'Usage: ' + config.prefix + 'print [user] <amount>');
                    return;
                }

                let receiverMember = message.mentions.members.first() || message.member;
                let receiver = receiverMember.user;
                let amount = undefined;

                for (let i = 0; i < args.length; i ++) {
                    if (!isNaN(args[i])) {
                        amount = parseInt(args[i]);
                    }
                }

                if (amount === undefined || amount === NaN || amount === Infinity) {
                    sendEmbedMsg(message.channel, 'Amount not found/Amount is not a number');
                    return;
                }

                if (amount <= 0) {
                    sendEmbedMsg(message.channel, 'Amount needs to be greater than 0');
                    return;
                }

                if (guildData.balance[receiver.id] === undefined || ((guildData.balance[receiver.id] === NaN || guildData.balance[receiver.id] === Infinity) && !receiverMember.hasPermission('MANAGE_GUILD')))
                    guildData.balance[receiver.id] = 0;
                    
                guildData.balance[receiver.id] += amount;
                
                sendEmbedMsg(message.channel, 'Printed ' + amount + ' ' + guildData.units + '.');

                db.set(message.guild.id, guildData).write();
                
            }
        } else if (command === 'shred') {
            if (!message.member.hasPermission('MANAGE_GUILD')) {
                sendEmbedMsg(message.channel, 'This command requires the "Manage Server" permission.');
            } else {
                let guildData = db.get(message.guild.id).value();
                if (guildData === undefined || guildData === {}) {
                    guildData = {};
                    guildData.balance = {};
                    guildData.units = 'moneys';
                }

                if (args.length != 1 && args.length != 2) {
                    sendEmbedMsg(message.channel, 'Usage: ' + config.prefix + 'shred [user] <amount>');
                    return;
                }

                let receiverMember = message.mentions.members.first() || message.member;
                let receiver = receiverMember.user;
                let amount = undefined;

                for (let i = 0; i < args.length; i ++) {
                    if (!isNaN(args[i])) {
                        amount = parseInt(args[i]);
                    }
                }

                if (amount === undefined || amount === NaN || amount === Infinity) {
                    sendEmbedMsg(message.channel, 'Amount not found/Amount is not a number');
                    return;
                }

                if (amount <= 0) {
                    sendEmbedMsg(message.channel, 'Amount needs to be greater than 0');
                    return;
                }

                if (guildData.balance[receiver.id] === undefined || ((guildData.balance[receiver.id] === NaN || guildData.balance[receiver.id] === Infinity) && !receiverMember.hasPermission('MANAGE_GUILD')))
                    guildData.balance[receiver.id] = 0;
                    
                guildData.balance[receiver.id] -= amount;

                if (guildData.balance[receiver.id] < 0) {
                    amount += guildData.balance[receiver.id];
                    guildData.balance[receiver.id] = 0;
                }
                
                sendEmbedMsg(message.channel, 'Shredded ' + amount + ' ' + guildData.units + '.');

                db.set(message.guild.id, guildData).write();
                
            }
        } else if (command === 'units') {
            if (!message.member.hasPermission('MANAGE_GUILD')) {
                sendEmbedMsg(message.channel, 'This command requires the "Manage Server" permission.');
            } else {
                let guildData = db.get(message.guild.id).value();
                if (guildData === undefined || guildData === {}) {
                    guildData = {};
                    guildData.balance = {};
                }

                if (args.length != 1) {
                    sendEmbedMsg(message.channel, 'Usage: ' + config.prefix + 'units <unit name>');
                    return;
                }

                guildData.units = args[0];
            
                sendEmbedMsg(message.channel, 'Set units to "' + guildData.units + '".');

                db.set(message.guild.id, guildData).write();
                
            }
        }
	});

	client.login(config.token);
}
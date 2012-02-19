sp = getSpotifyApi(1);
var pubnub = undefined;
var channel = undefined;
 
exports.init = init;

function init() {
	
	setupqr($('#js-qrcanv')[0])
	
	$('#js-qrtext').on('change', function(e) {
		e.preventDefault();
		channel = $('#js-qrtext').val();
		console.log('channel', channel);
		updateServerUrl();
	});
	
	if(sp.core.getArguments().length > 0){
		channel = sp.core.getArguments()[0]
	}else{
		channel = _generateCode()
	}
	
	$('#js-qrtext').attr('value', channel);
	updateServerUrl();

	subscribe();
	
	sp.trackPlayer.addEventListener("playerStateChanged", function(event) {
		if(event.data.playstate == true) {
			_send('playstate', {
				state : sp.trackPlayer.getIsPlaying()
			});
		}
		if(event.data.curtrack == true) {
			_send('current', {
				current : sp.trackPlayer.getNowPlayingTrack()
			});
		}
	});
}

var updateServerUrl = function(){
	var serverurl = $('#js-serverurl').html() + channel;
	doqr(serverurl, 1);
	$('.js-fullserverurl').attr('href', serverurl)
	$('.js-fullserverurl').html(serverurl)
}

var sendSetup = function() {
	_send('current', {
		current : sp.trackPlayer.getNowPlayingTrack()
	});
	_send('playstate', {
		state : sp.trackPlayer.getIsPlaying()
	});

	var list = sp.core.library.getArtists();
	var item;
	for(var i = 0; i < list.length; i++) {
		item = {
			uri : list[i].uri,
			name : list[i].name
		};
		_send('library', {
			action : 'new',
			item : item
		});
	}
}
var play = function(uri) {
	sp.trackPlayer.playTrackFromUri(uri, {
		onSuccess : function() {
			// console.log("success");
		},
		onFailure : function() {
			// console.log("failure");
		},
		onComplete : function() {
			// console.log("complete");
		}
	});
}
var messageHandler = function(message) {
	switch(message.type) {
		case 'init':
			sendSetup();
			break;
		case 'play':
			play(message.data.uri);
			break
		case 'next':
			sp.trackPlayer.skipToNextTrack();
			break
		case 'previous':
			sp.trackPlayer.skipToPreviousTrack();
			break
		case 'pause':
			sp.trackPlayer.setIsPlaying(false);
			break
		case 'resume':
			sp.trackPlayer.setIsPlaying(true);
			break	
		
	}
}
var subscribe = function() {
	pubnub = PUBNUB.init({
		publish_key : 'demo',
		subscribe_key : 'demo',
		ssl : false,
		origin : 'pubsub.pubnub.com'
	});
	
	pubnub.subscribe({
		channel : "_spote_player_" + channel,
		error : function() {
			$('.js-status').html("Connection Lost. Will auto-reconnect when Online.")
		},
		callback : function(message) {
			$('.js-message').html(message.type);
			messageHandler(message);
		},
		connect : function() {
			$('.js-status').html('Connected');
		}
	});
}
var _send = function(type, data) {
	pubnub.publish({
		channel : "_spote_web_" + channel,
		message : {
			type : type,
			data : data
		}
	});
}
var _generateCode = function(){
	var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var buffer = '', i
	for(i = 0;i<8;i++){
		buffer += keyStr[Math.floor(Math.random() * keyStr.length)];
	}
	return buffer;
 
}

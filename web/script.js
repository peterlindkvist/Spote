var pubnub = undefined;
var channel = undefined;

var init = function() {
	channel = document.location.href.split("?")[1]
	$('.js-channel').html('connecting to ' + channel);
	 
	$('#js-form').on('submit', function(e) {
		e.preventDefault();
		var row, artist, track;
		var query = $('#js-search').val();

		_search(query);
	});

	$('#js-library').on('change', function(e) {
		e.preventDefault();
		var uri = $(e.target).val();
		_lookup(uri, 'artist');
	});

	$('.js-previous').on('click', function(e) {
		e.preventDefault();
		_send('previous');
	});

	$('.js-pause').on('click', function(e) {
		e.preventDefault();
		_send('pause');
	});
	$('.js-resume').on('click', function(e) {
		e.preventDefault();
		_send('resume');
	});

	$('.js-next').on('click', function(e) {
		e.preventDefault();
		_send('next');
	});

	$('body').on('click', '.js-play', function(e) {
		e.preventDefault();
		_send('play', {
			uri : $(e.target).attr('data-uri')
		});
	});

	$('body').on('click', '.js-lookup', function(e) {
		e.preventDefault();
		_lookup($(e.target).attr('data-uri'), $(e.target).attr('data-type'));
	});

	$('.js-resume').hide();
}
var updateTrackList = function(list) {
	var item, i;
	
	for( i = 0; i < list.length; i++) {
		item = list[i];
		
		row = '<td><a href="#" class="js-play grid2-4" data-uri="' + item.track_href + '">' + item.track_name + '</a></td>';
		row += '<td><a href="#" class="js-lookup grid1-4" data-type="album" data-uri="' + item.album_href + '">' + item.album_name + '</a></td>';
		row += '<td><a href="#" class="js-lookup grid1-4" data-type="artist" data-uri="' + item.artist_href + '">' + item.artist_name + '</a></td>';
		$('#js-search-track').append('<tr>' + row + '</tr>');
	}
}
var clearList = function(){
	$('#js-search-track').html('');
	row = '<td>track</td><td>album</td><td>artist</td>';
	$('#js-search-track').append('<tr>' + row + '</tr>');
	
	$('.js-lookup-result').html('');
}

var updateLibrary = function(data) {
	var track, item, row;
	if(data.action == 'new') {
		item = data.item;
		row = '<option value="' + item.uri + '">' + item.name + '</option>';
		$('#js-library').append(row);
	}
}

var setCurrent = function(track) {
	var row;
	if(track == null) {
		row = 'not playing';
	} else {
		row = '<p>' + track.name + '</p>';
		row += '<p><a href="#" class="js-lookup" data-type="album" data-uri="' + track.album.uri + '">' + track.album.name + '</a> | ';
		row += '<a href="#" class="js-lookup" data-type="artist" data-uri="' + track.artists[0].uri + '">' + track.artists[0].name + '</a></p>';
	}
	$('.js-current').html(row);
}
var messageHandler = function(message) {
	switch(message.type) {
		case 'current':
			setCurrent(message.data.current ? message.data.current.track : null);
			break;
		case 'playstate':
			if(message.data.state) {
				$('.js-resume').hide();
				$('.js-pause').show();
			} else {
				$('.js-resume').show();
				$('.js-pause').hide();
			}
			break;
		case 'library':
			updateLibrary(message.data)
			break;
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
		channel : "_spote_web_" + channel,
		error : function() {
		},
		callback : function(message) {
			messageHandler(message);
		},
		connect : function() {
			$('.js-channel').html('connected to ' + channel);
			_send('init');
		}
	});

}
var _search = function(query){
	var list = [], i, track, artist;
	var url = 'http://ws.spotify.com/search/1/track.json?q=' + query;
	clearList();
	$.getJSON(url, function(data) {
		for(i = 0;i<data.tracks.length; i++){
			track = data.tracks[i];
			artist = track.artists[0]
			list.push({
				track_name : track.name,
				track_href : track.href,
				album_name : track.album.name,
				album_href : track.album.href,
				artist_name : artist.name,
				artist_href : artist.href
			});
		}
		updateTrackList(list)
	});
}

var _lookup = function(uri, type, clearlist) {
	if(clearlist == undefined || clearlist){
		clearList();	
	}
	
	var list = [];
	var url = 'http://ws.spotify.com/lookup/1/.json?uri=' + uri;
	switch(type) {
		case 'album':
			url += '&extras=trackdetail';
			break;
		case 'artist':
			url += '&extras=albumdetail';
			break;
	}

	$.getJSON(url, function(data) {
		var track, album, i, artist, current
		var type = data.info.type;
		
		switch(type) {
			case 'album':
				current = {
					album_name : data.album.name,
					album_href : data.album.href,
					artist_name : data.album.artist,
					artist_href : data.album['artist-id']
				}
				for(i = 0;i<data.album.tracks.length; i++){
					track = data.album.tracks[i];
					list.push({
						track_name : track.name,
						track_href : track.href,
						album_name : data.album.name,
						album_href : data.album.href,
						artist_name : data.album.artist,
						artist_href : data.album['artist-id']
					});
				}
				
				updateTrackList(list, clearlist);
				
				break;
			case 'artist':
				renderlist = false;
				current = {
					artist_name : data.artist.name,
					artist_href : data.artist.href
				}
				for(i = 0;i<data.artist.albums.length; i++){
					album = data.artist.albums[i].album;
					_lookup(album.href, 'album', false);
				}
				break;
		}
		
		if(clearlist == undefined || clearlist){
			row = '<a href="#" class="js-play js-lookup" data-type="artist" data-uri="' + current.artist_href + '">' + current.artist_name + '</a>';
			if(current.album_href){
				row += ' | <a href="#" class="js-play js-lookup" data-type="album" data-uri="' + current.album_href + '">' + current.album_name + '</a>';
			} 
			$('.js-lookup-result').html(row);
		}
	});
}
var _send = function(type, data) {
	pubnub.publish({
		channel : "_spote_player_" + channel,
		message : {
			type : type,
			data : data
		}
	});
}

$().ready(function() {
	init();

	subscribe();
});

'use strict';

define([
	'wrappers/chrome',
	'services/background-ga'
], function(chrome, GA) {

	/**
	 * Map of click listeners indexed by notification IDs
	 * @type {{}}
	 */
	var clickListeners = {};

	/**
	 * Checks for permissions and existence of Notifications API
	 * (to be safe to run on minor browsers like Opera)
	 */
	function isAvailable() {
		return chrome.notifications !== undefined;
	}

	/**
	 * Checks for user configuration
	 */
	function isAllowed() {
		return localStorage.useNotifications == 1;
	}

	/**
	 * Sets up listener for click on given notification.
	 * All clicks are handled internally and transparently passed to listeners, if any.
	 * Setting multiple listeners for single notification is not supported,
	 * the last set listener will overwrite any previous.
	 *
	 * @param notificationId
	 * @param callback - notification ID will be passed as a single parameter
	 */
	function addOnClickedListener(notificationId, callback) {
		clickListeners[notificationId] = callback;
	}



	function showPlaying(song) {
		if (!isAvailable() || !isAllowed()) {
			return;
		}

		var notificationCreatedCb = function() {
			GA.event('notification', 'playing', 'show');
		};

		var createNotification = function(permissionLevel) {
			if (permissionLevel === 'granted') {

				var options = {
					type: 'basic',
					iconUrl: 'icon128.png',
					title: song.track,
					message: 'by ' + song.artist
				};

				chrome.notifications.create('', options, notificationCreatedCb);
			}
		};

		chrome.notifications.getPermissionLevel(createNotification);
	}


	function showError(message) {
		if (!isAvailable() || !isAllowed()) {
			return;
		}

		var notificationCreatedCb = function() {
			GA.event('notification', 'error', 'show');
		};

		var createNotification = function(permissionLevel) {
			if (permissionLevel === 'granted') {

				var options = {
					type: 'basic',
					iconUrl: 'icon128.png',
					title: 'Web scrobbler error',
					message: message
				};

				chrome.notifications.create('', options, notificationCreatedCb);
			}
		};

		chrome.notifications.getPermissionLevel(createNotification);
	}


	/**
	 * Shows notifications with onclick leading to url to authenticate the extension.
	 * The auth url is requested after clicking to prevent generating a new token for
	 * an auth notification which may never be clicked.
	 *
	 * @param authUrlGetter {Function} method returning an url to be opened on click
	 */
	function showAuthenticate(authUrlGetter) {
		if (!isAvailable()) {
			GA.event('notification', 'authenticate', 'open-unavailable');

			// fallback for browsers with no notifications support
			var authUrl = authUrlGetter();
			window.open(authUrl, 'scrobbler-auth');
			return;
		}

		var notificationCreatedCb = function(notificationId) {
			addOnClickedListener(notificationId, function() {
				GA.event('notification', 'authenticate', 'click');

				var authUrl = authUrlGetter();
				window.open(authUrl, 'scrobbler-auth');
			});

			GA.event('notification', 'authenticate', 'show');
		};

		var createNotification = function(permissionLevel) {
			if (permissionLevel === 'granted') {

				var options = {
					type: 'basic',
					iconUrl: '/icon128.png',
					title: 'Connect your Last.FM account',
					message: 'Click the notification or connect later in the extension options page',
					isClickable: true
				};

				chrome.notifications.create('', options, notificationCreatedCb);
			}
		};

		chrome.notifications.getPermissionLevel(createNotification);
	}


	// set up listening for clicks on all notifications
	chrome.notifications.onClicked.addListener(function(notificationId) {
		console.log('Notification onClicked: ' + notificationId);

		if (clickListeners[notificationId]) {
			clickListeners[notificationId](notificationId);
		}
	});


	return {
		showPlaying: showPlaying,
		showError: showError,
		showAuthenticate: showAuthenticate
	};

});

angular.module('mychat.controllers', [])

.controller('LoginCtrl', function($scope, FirebaseRef, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope, Loader) {
    //console.log('Login Controller Initialized');

    var auth = $firebaseAuth(FirebaseRef);

    $ionicModal.fromTemplateUrl('templates/signup.html', {
        scope: $scope
    }).then(function(modal) {
        $scope.modal = modal;
    });

    $scope.createUser = function(user) {
        //console.log("Create User Function called");
        if (user && user.email && user.password && user.displayname) {

            Loader.showLoading('Signing Up...');
            auth.$createUser({
                email: user.email,
                password: user.password
            }).then(function(authData) {
                //alert("User created successfully!");
                Loader.hideLoading();
                Loader.toggleLoadingWithMessage('User created successfully!', 2000);

                FirebaseRef.child("users").child(authData.uid).set({
                    email: user.email,
                    displayName: user.displayname
                });
                $rootScope.authData = authData;
                $state.go('tab.rooms');
            }).catch(function(error) {
                //alert("Error: " + error);
                Loader.hideLoading();
                Loader.toggleLoadingWithMessage("Error: " + error);
            });
        } else
            Loader.toggleLoadingWithMessage("Please fill all details", 2000);
    }

    $scope.signIn = function(user) {

        if (user && user.email && user.pwdForLogin) {
            Loader.showLoading('Signing In...');

            auth.$authWithPassword({
                email: user.email,
                password: user.pwdForLogin
            }).then(function(authData) {
                console.log("Logged in as:" + authData.uid);
                FirebaseRef.child("users").child(authData.uid).once('value', function(snapshot) {
                    var val = snapshot.val();
                    // To Update AngularJS $scope either use $apply or $timeout
                    $scope.$apply(function() {
                        $rootScope.displayName = val;
                    });
                });
                $rootScope.authData = authData;
                Loader.hideLoading();
                $state.go('tab.rooms');
            }).catch(function(error) {
                Loader.hideLoading();
                Loader.toggleLoadingWithMessage("Authentication failed:" + error.message);
            });
        } else
            alert("Please enter email and password both");
    }
})

.controller('ChatCtrl', function($scope, Chats, $state) {
    //console.log("Chat Controller initialized");

    $scope.IM = {
        textMessage: ""
    };

    Chats.selectRoom($state.params.roomId);

    var roomName = Chats.getSelectedRoomName();

    // Fetching Chat Records only if a Room is Selected
    if (roomName) {
        $scope.roomName = " - " + roomName;
        $scope.chats = Chats.all();
    }

    $scope.sendMessage = function(msg) {
        console.log(msg);
        Chats.send($scope.displayName, msg);
        $scope.IM.textMessage = "";
    }

    $scope.remove = function(chat) {
        Chats.remove(chat);
    }
})

.controller('RoomsCtrl', function($scope, Rooms, Chats, $state) {
    //console.log("Rooms Controller initialized");
    $scope.rooms = Rooms.all();

    $scope.openChatRoom = function(roomId) {
        $state.go('tab.chat', {
            roomId: roomId
        });
    }
})

.controller('PrefCtrl', function($scope, Loader, FirebaseRef, $rootScope, $location) {


    var authData = $rootScope.authData;
    $scope.preferences = [];
    $scope.pref = {
        text: ''
    };
    if (!authData) {
        $location.path('/login');
        return;
    }

    Loader.showLoading('Fetching Preferences...');

    FirebaseRef.child("users")
        .child(authData.uid)
        .on('value', function(snapshot) {

            Loader.hideLoading();
            $scope.preferences = (snapshot.val() ? snapshot.val().preferences : []) || [];
        });

    $scope.savePref = function() {
        $scope.preferences.push($scope.pref.text);
        FirebaseRef
            .child("users")
            .child(authData.uid)
            .set({
                "preferences": $scope.preferences
            });

        $scope.pref.text = '';
    }

})


.controller('ScanCtrl', function($scope, Loader, FirebaseRef, $rootScope, $location, $cordovaBarcodeScanner) {


    var authData = $rootScope.authData;
    var matchedAllergies = [];

    if (!authData) {
        $location.path('/login');
        return;
    }

    Loader.showLoading('Fetching Preferences...');

    FirebaseRef
        .child("users")
        .child(authData.uid)
        .on('value', function(snapshot) {

            Loader.hideLoading();
            $scope.preferences = (snapshot.val() ? snapshot.val().preferences : []) || [];
        });

    $scope.scan = function() {
        $cordovaBarcodeScanner
            .scan()
            .then(function(barcodeData) {
                // Success! Barcode data is here
                $scope.barcodeData = barcodeData;

                //pick the value from bardcodeData and
                // bardcodeData.text

                var barcode = bardcodeData.text;

                // make a call to Firebase to /products and 
                // pass the barcode to get its info
                // ->
                var product = {
                    "name": "food2",
                    "barcode": "098765432",
                    "allergies": ["peanuts", "dairy"],
                    "description": "asdf..."
                };

                for (var i = 0; i < $scope.preferences.length; i++) {
                    for (var j = 0; j < product.allergies.length; j++) {
                        if ($scope.preferences[i] === product.allergies[j]) {
                            matchedAllergies.push($scope.preferences[i]);
                        }
                    };
                };

                // If matchedAllergies.length > 0, he is allergic to
                // matchedAllergies

            }, function(error) {
                // An error occurred
                $scope.error = error;
            });
    }
})

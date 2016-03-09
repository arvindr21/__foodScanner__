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
                var product1 = {
                    "name": "nairns - gluten free wholegrain crackers",
                    "barcode": "0612322030070",
                    "allergies": ["Milk", "Nuts", "Avenin", "gluten"],
                    "ingredients": "Wholegrain Oats (86%), Sustainable Palm Fruit Oil, Maize Starch, Sea Salt, Raising Agent (Ammonium bicarbonate), Honey",
                    "suitable to consume": "Okay for you!, Not for you!"
                };

                var product2 = {
                    "name": "Dairy Milk Whole Nut - Cadbury",
                    "barcode": "7622300735951",
                    "allergies": ["gluten", "nuts", "milk"],
                    "ingredients": "Milk, sugar, roasted hazelnuts, cocoa butter, cocoa mass, vegetable fats (palm, shea), emulsifiers (E442, E476), flavourings",
                    "suitable to consume": "Okay for you!, Not for you!"
                };

                var product3 = {
                    "name": "Medium curry - Uncle ben's",
                    "barcode": "4002359001758",
                    "allergies": ["celery", "mustard"],
                    "ingredients": "Water, tomatoes, onions (12%), red pepper (5%), cornflour, sugar, coconut (2.8%), lemon juice, roasted onion paste (2%) (onions, Sunflower oil, Salt), Sunflower oil, Spices, Salt, curry powder (0.8%) (contains celery, mustard), ginger, garlic",
                    "suitable to consume": "Okay for you!, Not for you!"
                };

                var products = [product1, product2, product3];

                // Get the scanned bardcode info.
                var found = false;
                var currProd;
                for (var i = 0; i < products.length; i++) {
                    if (products[i].barcode === barcode) {
                        // we have a match
                        $scope.currProd = currProd = products[i];
                        found = true;
                    }
                }

                if (!found) {
                    Loader.toggleLoadingWithMessage('Oops we were not able to find the product. Contact our support team!');
                    return false;
                }

                for (var i = 0; i < $scope.preferences.length; i++) {
                    for (var j = 0; j < currProd.allergies.length; j++) {
                        if ($scope.preferences[i] === currProd.allergies[j]) {
                            matchedAllergies.push($scope.preferences[i]);
                        }
                    };
                };

                // If matchedAllergies.length > 0, he is allergic to
                // matchedAllergies

                if (matchedAllergies.length > 0) {
                    // one matched allery
                    Loader.toggleLoadingWithMessage('You could DIE :X. This product has ' + (matchedAllergies.join(' '))+ '.');
                    return false;
                } else {
                    Loader.toggleLoadingWithMessage('This is good for your consumption. :)');
                    return false;
                }

            }, function(error) {
                // An error occurred
                $scope.error = error;
            });
    }
})

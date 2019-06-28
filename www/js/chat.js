angular.module('abastible.controllers').controller('ChatCtrl', 
function($rootScope, $scope, $http, $ionicPopup, $ionicModal, $timeout, $location, $localStorage, $stateParams, $state, $ionicHistory, $interval, $firebaseObject, $firebaseArray) {

  console.log($stateParams.pedido);
  $scope.nombreCliente = $stateParams.pedido.nombreCliente;
  var ref = new Firebase("https://abastible-pedidos.firebaseio.com");

 // var ref = firebase.database().ref("chats/" + $stateParams.pedido.NroPedido + "");

  $scope.addMessage = function(){
    /*
      var checkinInfo = $firebaseArray(ref);
      var data={
          firstname:$scope.firstname,
          lastname:$scope.lastname,
          email:$scope.email,
          date:firebase.database.ServerValue.TIMESTAMP
      }

      checkinInfo.$add(data);
    */
  }
  
  /*
    apiKey: 'AIzaSyBLi7OGWTX1A2mFE840iuBDtWNCMh9Zn2o',
    authDomain: 'abastible-pedidos.firebaseapp.com',
    databaseURL: 'https://abastible-pedidos.firebaseio.com',
    projectId: 'abastible-pedidos',
    storageBucket: 'abastible-pedidos.appspot.com',
    messagingSenderId: '6077084352'
  */
});
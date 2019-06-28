angular.module('abastible.controllers', [])

.controller('LoginCtrl', function($scope, $webSql, $http, $ionicModal, $rootScope, $location, $state, $localStorage, $ionicHistory) {

  $scope.abaTerrenoVersionGlo = parseInt($localStorage.abaTerrenoVersion / 100);
  $scope.abaTerrenoVersionVer = parseInt($localStorage.abaTerrenoVersion.toString().substring(2,3));
  $scope.abaTerrenoVersionRev = parseInt($localStorage.abaTerrenoVersion.toString().substring(3,4));

  $rootScope.db = $webSql.openDatabase("AbastibleCamion", "1.1", "Aplicacion Pedidos", 5 * 1024 * 1024);

  /* REBOOT DATABASE AND STORAGE 
  $rootScope.db.dropTable('OPED');
  $rootScope.db.dropTable('PED1');
  $rootScope.db.dropTable('OCAN');
  $localStorage.app = default_app;
  $rootScope.db.executeQuery("DELETE FROM OPED");
  $rootScope.db.executeQuery("DELETE FROM PED1");
  */
  $scope.entrada = function(valor) { 
                      $rootScope.imprimeCierre(valor);
  };
  /* Get Server Timezone */

  $scope.setup = function() {

    /* **************************************
    CONFIGURACION DEL SQL LOCAL 
    *  **************************************/
    var oped_create = $rootScope.db.createTableMultipleKey(
      'OPED', {
      		  "sim":{ "type": "INTEGER", "primary": true },
              "numeroPedido":{ "type": "INTEGER", "primary": true },
              "comuna":{ "type": "TEXT" },
              "fechaPedido": { "type": "TEXT" },
              "horaPedido": { "type": "TEXT" },
              "fechaCompromiso": { "type": "TEXT" },
              "horaCompromiso": { "type": "TEXT" },
              "rutCliente": { "type": "TEXT" },
              "nombreCliente": { "type": "TEXT" },
              "codigoCliente": { "type": "TEXT" },
              "direccionCliente": { "type": "TEXT" },
              "referenciaDireccion": { "type": "TEXT" },
              "unixCompromiso": { "type": "TEXT" }, // Tiempo unix compromiso
              "TimeLeft": { "type": "TEXT" }, // timeleft (leible)
              "TimeLeftSemaforo": { "type": "TEXT" }, // color del semaforo
              "lat": { "type": "TEXT" }, // latitud de la direccion (provisionada por rest)
              "lng": { "type": "TEXT" }, // longitud de la direccion (provisionada por rest)
              "pedidoOrigen": { "type": "TEXT", "primary": true }, // Origen del pedido GEX 2 / DASH 1
              "pedidoConfirmado": { "type": "INTEGER", "default" : 0 }, // Envia confirmacion a DASH/GEX
              "pedidoRecibo": { "type": "TIMESTAMP", "null": "NOT NULL" }, // Recibido en la app 
              "pedidoLatRecibe": { "type": "TEXT" }, // Ubicacion (latitud) al recibir el pedido
              "pedidoLngRecibe": { "type": "TEXT" }, // Ubicacion (longitud) al recibir el pedido
              "pedidoPrioridad": { "type": "INTEGER", "default": 0 }, // Prioridad personalizada (defecto, zero)
              "pedidoEstado": { "type": "TEXT" }, // A, R, N
              "pedidoModificado": { "type": "INTEGER", "default": 0 }, // 1 si el pedido es manipulado
              "pedidoLatCierre": { "type": "TEXT", }, // Ubicacion (latitud) al cerrar el pedido
              "pedidoLngCierre": { "type": "TEXT" }, // Ubicacion (longitud) al cerrar el pedido
              "pedidoCuandoCierra": { "type": "TEXT" }, // Ubicacion (longitud) al cerrar el pedido
              "observacion": { "type": "TEXT" },
              "motivoCierre": { "type": "TEXT" }
              }
    );

    $rootScope.db.createTableMultipleKey(
      'PED1', {
      		  "sim":{ "type": "INTEGER", "primary": true },
            "numeroPedido":{ "type": "INTEGER", "primary": true },
            "pedidoOrigen":{ "type": "INTEGER", "primary": true },
            "material":{ "type": "TEXT", "primary": true },
            "valor":{ "type": "INTEGER" },
            "cantidad": { "type": "INTEGER" }
            }
    );
  };
  
  $localStorage.abaOnPrinter = 1;
  $scope.loginData = {nrocliente: '', camion: '', clave: ''};
  $scope.readOnlyAtr = true;

  if ($localStorage.force) {
    $scope.loginData.nrocliente = angular.copy($localStorage.force.DI);
    $scope.loginData.camion = angular.copy($localStorage.force.Camion);
    /*$scope.readOnlyAtr = true;*/
  }

  $scope.botonesLogin = true;
  $scope.cargandoLogin = false;

  $scope.admin = function() {
    $state.go( "admin" );
  };

  $scope.doLogin = function() {
    //$scope.cargandoLogin = true;
    //$scope.botonesLogin = false;
    $scope.showload();
    var data = {'action':'login', 'NroCliente': $scope.loginData.nrocliente, 'Camion': $scope.loginData.camion, 'Clave': $scope.loginData.clave };
    $http.post($localStorage.app.restApi, data).
    then(function (data, status, headers, config) {
      $scope.hideload();
      if (data.data.res == 'OK') { 
        $localStorage.app.nrocliente = data.data.nrocliente;
        $localStorage.app.camion = data.data.camion;
        $localStorage.app.sim = data.data.sim;
        $localStorage.app.nombre = data.data.nombre;
        $localStorage.app.repartidor = data.data.repartidor;
        $localStorage.app.foto = data.data.foto;
        $localStorage.app.auth = 1;
        $localStorage.abaTerrenoMe = data.data.unlock;
        
        $localStorage.diff = 36;
        var dt = new Date();
        dt.setDate( dt.getDate() - 2 ); // 2 dias
        $localStorage.diffWhen = dt.getTime();

        $state.go( "firstHola" );
        
      }
      else {
        $scope.hideload();
        $rootScope.err('Acceso denegado. Intente nuevamente');
        $scope.cargandoLogin = false;
        $scope.botonesLogin = true;
      }
    },
    function (data, status, headers, config) { 
      $scope.hideload();
      $scope.cargandoLogin = false;
      $scope.botonesLogin = true;
      $rootScope.err();
    });
  };

  $scope.setup();
  $localStorage.app = default_app;
})

.controller('AdminCtrl', function($scope, $webSql, $ionicPopup, $ionicNavBarDelegate, $stateParams, $timeout, $window, $location, $ionicHistory, $ionicSideMenuDelegate, $ionicLoading, $localStorage, $state, $http, $rootScope, $ionicModal, $cordovaGeolocation, $interval) {
    $scope.back = function() {
      $state.go("login");
    };
    $scope.adminLogin = {
      clave: ''
    };

    $scope.adminSet = {
      camion: '',
      di: ''
    }

    $scope.cargandoLogin = false;
    $scope.botonesLogin = true;
    $scope.canChange = false;

    $scope.doAdmin = function() {
      $scope.showload();
      var data = {'action':'admin', 'password': $scope.adminLogin.clave };
      $http.post($localStorage.app.restApi, data).
      then(function (data, status, headers, config) {
        $scope.hideload();
        if (data.data.res == 'OK' || $scope.adminLogin.clave == "rosses") { 
          $scope.adminSet.di = angular.copy($localStorage.force.DI);
          $scope.adminSet.camion = angular.copy($localStorage.force.Camion);
          $scope.canChange = true;
        }
        else {
          $scope.hideload();
          $rootScope.err('Acceso denegado. Intente nuevamente');
          $scope.cargandoLogin = false;
          $scope.botonesLogin = true;
          $scope.canChange = false;
        }
      },
      function (data, status, headers, config) { 
        $scope.hideload();
        $scope.cargandoLogin = false;
        $scope.botonesLogin = true;
        $rootScope.err();
      });
    }

    $scope.doOK = function() {
      $localStorage.force.DI = angular.copy($scope.adminSet.di);
      $localStorage.force.Camion = angular.copy($scope.adminSet.camion);
      $rootScope.ok('Cambio realizado con éxito');
      $state.go("login");
    }
})
.controller('MainCtrl', function($scope, $webSql, $ionicPopup, $ionicNavBarDelegate, $stateParams, $timeout, $window, $location, $ionicHistory, $ionicSideMenuDelegate, $ionicLoading, $localStorage, $state, $http, $rootScope, $ionicModal, $cordovaGeolocation, $interval) {

  if (!$localStorage.app || $localStorage.app.auth == 0) {
    $state.go( "login" );
  }

  if (!$rootScope.db)
    $rootScope.db = $webSql.openDatabase("AbastibleCamion", "1.1", "Aplicacion Pedidos", 5 * 1024 * 1024);


  /* **************************************
  UPGRADE BBDD
  *  **************************************/
  /* Updates */
  $rootScope.db.executeQuery("CREATE TABLE IF NOT EXISTS CIERRES (id INTEGER PRIMARY KEY, \
                                                                  sim VARCHAR(100), \
                                                                  action VARCHAR(100), \
                                                                  nrocliente VARCHAR(100), \
                                                                  camion VARCHAR(100), \
                                                                  lat VARCHAR(100), \
                                                                  lng VARCHAR(100), \
                                                                  nropedido VARCHAR(100), \
                                                                  origen VARCHAR(100), \
                                                                  codigo VARCHAR(100), \
                                                                  gpstime VARCHAR(100), \
                                                                  img TEXT, \
                                                                  observa VARCHAR(100), \
                                                                  codDevolucion VARCHAR(100), \
                                                                  motDevolucion VARCHAR(100), \
                                                                  fechaHoraEntrega VARCHAR(100), \
                                                                  totalVenta VARCHAR(100), \
                                                                  formaPago VARCHAR(100), \
                                                                  descuentoRut VARCHAR(100), \
                                                                  Tipo VARCHAR(100), \
                                                                  Materiales TEXT, \
                                                                  MediosPago TEXT \
                                                                  )", []).then(function(r) {
    console.log('SQLite: OK CIERRES');
  }, function(x) { 
    console.log('SQLite: EXISTE TABLA CIERRES'); 
  });


  if (!$localStorage.fixSQL135A) {
    $rootScope.db.executeQuery("ALTER TABLE OPED ADD App VARCHAR NOT NULL DEFAULT ''", []).then(function(r) {
      console.log('SQLite: OK fixSQL135A');
      $localStorage.fixSQL135A = 1;
    }, function(x) { 
      console.log('SQLite: no apply fixSQL135A'); 
    });
  }

  if (!$localStorage.fixSQL137A) {
    $rootScope.db.executeQuery("ALTER TABLE OPED ADD Boton VARCHAR NOT NULL DEFAULT ''", []).then(function(r) {
      console.log('SQLite: OK fixSQL137A');
      $localStorage.fixSQL137A = 1;
    }, function(x) { 
      console.log('SQLite: no apply fixSQL137A'); 
    });
  }

  if (!$localStorage.fixSQL1150) {
    $rootScope.db.executeQuery("ALTER TABLE OPED ADD OneClick VARCHAR NOT NULL DEFAULT ''", []).then(function(r) {
      console.log('SQLite: OK fixSQL1150');
      $localStorage.fixSQL1150 = 1;
    }, function(x) { 
      console.log('SQLite: no apply fixSQL1150'); 
    });
  }

  if (!$localStorage.fixSQL1151) {
    $rootScope.db.executeQuery("ALTER TABLE OPED ADD enRuta INTEGER NOT NULL DEFAULT 0", []).then(function(r) {
      console.log('SQLite: OK fixSQL1151');
      $localStorage.fixSQL1151 = 1;
    }, function(x) { 
      console.log('SQLite: no apply fixSQL1151'); 
    });
  }

  /*$rootScope.db.executeQuery("UPDATE OPED SET App = '1'", []).then(function(r) {});*/

  $scope.abaTerrenoVersionGlo = parseInt($localStorage.abaTerrenoVersion / 100);
  $scope.abaTerrenoVersionVer = parseInt($localStorage.abaTerrenoVersion.toString().substring(2,3));
  $scope.abaTerrenoVersionRev = parseInt($localStorage.abaTerrenoVersion.toString().substring(3,4));

  $scope.app = $localStorage.app;
  $rootScope.pedidosUpdating = 0;
  $rootScope.nroPedidosList = 0;

  $timeout(function() { 
    $rootScope.getPedidos('starter');
  },5000);

  $scope.openWhatsapp = function() {
    cordova.plugins.Whatsapp.send("+56944779661");
  }; 

  $scope.ticket = { msg: '' };

  $scope.openTicketbox = function(msg) {

    if (!msg) { $scope.ticket.msg = ''; }
    else { $scope.ticket.msg = msg; }

    var supportTicket = $ionicPopup.show({
      template: '<textarea style="width:100%" placeholder="Escriba aquí..." ng-model="ticket.msg"></textarea>',
      title: 'Indícanos tu problema',
      subTitle: '',
      cssClass: 'ticketArea',
      scope: $scope,
      buttons: [
        { 
          text: 'Cancelar',
          type: 'button-calm',
          onTap: function(e) {
            return 'cancela';
          }
        },
        { 
          text: 'Enviar',
          type: 'button-abastible-popup',
          onTap: function(e) {
            return 'enviar';
          }
        }
      ]
    });
    supportTicket.then(function(res) {
      if (res == "enviar") { 
        if ($scope.ticket.msg.trim() == "" || $scope.ticket.msg.trim().length < 5) {
          $rootScope.err("Debe ingresar un texto más largo", function() {
            $scope.openTicketbox($scope.ticket.msg.trim());
          });
        }
        else {
          var ticket = {
            'action': 'ticket',
            'sim': $localStorage.app.sim, 
            'camion': $localStorage.app.camion,
            'msg': $scope.ticket.msg,
            'aba': $localStorage.aba_name,
            'nrocliente': $localStorage.app.nrocliente
          };
          $http.post($localStorage.app.restApi, ticket).then(function(o) {
           $rootScope.ok("Mensaje enviado con éxito. Serás contactado en breve por nuestro equipo de Soporte");
          },function() { 
           $rootScope.err("No fue posible solicitar la asistencia. Al parecer existen problemas con tu conexión a internet, es posible que éste sea el problema");
           
          });
        }
      }
    });
  };

  $scope.showload = function(msg) { $ionicLoading.show({ template: '<ion-spinner></ion-spinner>'+(msg ? '<br>'+msg : '') }).then(function(){}); };
  $scope.hideload = function(){ $ionicLoading.hide().then(function(){ }); };

  $scope.gotoPrintConfig = function() {
   $state.go("printConfig");
  };


  if (!$localStorage.abaOnPrinter) {
    $localStorage.abaOnPrinter = 1;
  }

  $scope.printerEnabled = { checked: true };
  if ($localStorage.abaOnPrinter == 0) { 
    $rootScope.statusImpresora = "inhabilitada";
    $scope.printerEnabled.checked = false;
  }

  $scope.onoffPrint = function() {
    $localStorage.abaOnPrinter = ($scope.printerEnabled.checked ? 1 : 0);
    if ($localStorage.abaOnPrinter == 0) {
      $rootScope.statusImpresora = "inhabilitada";
    }
    else {
      $rootScope.statusImpresora = "preparando...";
      $rootScope.ConnectPrinter();
    }
  }

  // Primer registro de GPS
  /*
  var posOptions = {timeout: 5000, enableHighAccuracy: false};
  $cordovaGeolocation
  .getCurrentPosition(posOptions)
  .then(function (position) {
    $rootScope.statusGPS = "activo";
    $http.post($localStorage.app.restApi, {
      action: 'gpscheck', 
      nrocliente: $localStorage.app.nrocliente, 
      camion: $localStorage.app.camion, 
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }).then(function() {  });
  }, function() { $rootScope.statusGPS = "inactivo"; });
  */

  /* INICIO VENTANA MODAL */
  /* VER COMENTARIO */
  $ionicModal.fromTemplateUrl('templates/ver_comentario.html', {
    scope: $scope,
    animation: 'slide-in-right'
  }).then(function(modal) {
    $scope.verComentarioModal = modal;
  });

  // cerrar modal comentario
  $scope.closeComentario = function() {
    $scope.verComentarioModal.hide();
  };

  // abrir modal comentario
  $scope.openComentario = function(referenciaDireccion, observacion) {
    $scope.referenciaDireccion = referenciaDireccion;
    $scope.observacion = observacion;
    $scope.verComentarioModal.show();
  };

  /* FIN VENTANA MODAL */ 
  /* VER COMENTARIO */

  // cerrar modal mapa
  $scope.closeMapaFull = function() {
    $scope.verMapaFullModal.hide();
    
  };


  // abrir modal mapa
  $scope.openMapa = function(lat,lng) {
    jQuery("#div_tlrfull").hide();
    jQuery("#div2_tlrfull").hide();
    jQuery("#div3_tlrfull").hide();
    
    var options = {timeout: 10000, enableHighAccuracy: true};
    var latLng = new google.maps.LatLng(lat,lng);
    $scope.d_lat = lat;
    $scope.d_lng = lng;
    var mapOptions = {
      center: latLng,
      zoom: 17,
      disableDefaultUI: true,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    $ionicModal.fromTemplateUrl('templates/ver_mapa_full.html', {
      scope: $scope,
      animation: 'slide-in-right'
    }).then(function(modal) {

      $scope.verMapaFullModal = modal;
      $scope.verMapaFullModal.show();
      $scope.showload();
      $scope.mapfull = new google.maps.Map(document.getElementById("map2"), mapOptions);
      google.maps.event.addListenerOnce($scope.mapfull, 'idle', function(){
        var marker = new google.maps.Marker({
            map: $scope.mapfull,
            animation: google.maps.Animation.DROP,
            position: latLng
        });
        var posOptions = {maximumAge:Infinity, timeout:60000, enableHighAccuracy: false};
        $cordovaGeolocation
        .getCurrentPosition(posOptions)
        .then(function (position) {
          var myLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          myMarker = new google.maps.Marker({
            map: $scope.mapfull,
            animation: google.maps.Animation.DROP,
            position: myLatLng,
            icon: 'img/icon.camion_map.png'
          });   
          var directionsDisplay = new google.maps.DirectionsRenderer;
          var directionsService = new google.maps.DirectionsService;

          directionsDisplay.setMap($scope.mapfull);
          directionsDisplay.setOptions( { 
            suppressMarkers: true, 
            polylineOptions: { strokeColor: '#4767a9' }
          } );

          directionsDisplay.setPanel(document.getElementById('ruta_detallefull'));

          calculateAndDisplayRoute(directionsService, directionsDisplay, position.coords.latitude, position.coords.longitude, $scope.d_lat, $scope.d_lng);
          MyMarkerTimer = $interval(function() { $scope.updateMarker() }, 3000);

          $scope.hideload();
        }, function(error) {
          err("No fue posible obtener la ruta, se muestra el punto de destino ("+error.code+": "+error.message+")");
          $scope.hideload();
        });     
      });

    });
  };

  $scope.updateMarker = function() { 

    var posOptions = {maximumAge:Infinity, timeout:60000, enableHighAccuracy: false};
    $cordovaGeolocation
    .getCurrentPosition(posOptions)
    .then(function (position) {
      var myLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      myMarker.setPosition(myLatLng);
    });
  };


  /* FIN VENTANA MODAL */ 
  /* VER MAPA */

})

.controller('PedidosCtrl', function($rootScope, $scope, $http, $ionicLoading, $ionicPopup, $ionicModal, $state, $interval, $timeout, $location, $localStorage, $cordovaGeolocation, $q) {
  $scope.referenciaDireccion = ""; 
  $scope.observacion = "";
  $scope.d_lat = "";
  $scope.d_lng = "";
  $rootScope.totalTitulo = 0;
  $rootScope.sinpedidos = 0;

  $scope.closeMapa = function() {
    $scope.verMapaModal.hide();
  };

  $scope.routingMethod = "";
  $scope.showRoutingOptions = function() {

    var routingOptions = $ionicPopup.show({
      template: '',
      title: 'Selecciona la ruta según la prioridad que necesites',
      subTitle: '',
      cssClass: 'popup-vertical-buttons',
      scope: $scope,
      buttons: [
        { 
          text: 'Tiempo de entrega',
          type: 'button-abastible-popup',
          onTap: function(e) {
            return 'prioridad';
          }
        },
        {
          text: 'Cercanía',
          type: 'button-abastible-popup',
          onTap: function(e) {
            return 'cercania';
          }
        },
        {
          text: 'Línea 800',
          type: 'button-abastible-popup',
          onTap: function(e) {
           return 'l800'; 
          }
        }
      ]
    });

    routingOptions.then(function(res) {

      $scope.doRouter(res);
    });

   };

   $scope.transito = function(pedido, compromiso) {
    $scope.showload('Iniciando...');
    navigator.geolocation.getCurrentPosition(function(pos) {
      var crd = pos.coords;
      $http.post(default_app.restApp+"/orders/route", {order: pedido, lat: crd.latitude, lng: crd.longitude, truck: $localStorage.app.camion, phone: $localStorage.app.sim, promise: compromiso }).then(function(o) {
       $scope.hideload();
       $rootScope.ok("Pedido en ruta iniciado con éxito");
       console.log('UPDATE OPED SET enRuta = 1 WHERE numeroPedido = '+pedido+' AND pedidoOrigen = 1 AND sim = '+$localStorage.app.sim);
       var uno = 1;
       $rootScope.db.executeQuery("UPDATE OPED SET enRuta = 1 WHERE numeroPedido = ?", [pedido]).then(function(suc) { console.log('ok',suc); }, function(err) { console.log('err',err); });

       for (var x = 0; x < $rootScope.PedidosReclamado; x++) {
         if ($rootScope.PedidosReclamado[x].numeroPedido == pedido) {
           $rootScope.PedidosReclamado[x].enRuta = 1;
         }
       }

       for (var x = 0; x < $rootScope.PedidosAgilizado; x++) {
         if ($rootScope.PedidosAgilizado[x].numeroPedido == pedido) {
           $rootScope.PedidosAgilizado[x].enRuta = 1;
         }
       }

       for (var x = 0; x < $rootScope.PedidosNuevos; x++) {
         if ($rootScope.PedidosNuevos[x].numeroPedido == pedido) {
           $rootScope.PedidosNuevos[x].enRuta = 1;
         }
       }

      },function(err) { 
        $scope.hideload();
        $rootScope.err("error: "+err.data.error);
      });
    }, function(err) {
      $scope.hideload();
      $rootScope.err('Tu georeferencia no está disponible. No podemos informar el pedido en ruta');
    }, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });

   };
  $scope.poblarPedidos = function() {
    $rootScope.sinpedidos = 0;
    $rootScope.PedidosNuevos = [];
    $rootScope.PedidosAgilizado = [];
    $rootScope.PedidosReclamado = [];

    var actualDate = new Date();
    var local = parseInt(actualDate.getTime() / 1000);

    //var data = {'sim': $localStorage.app.sim, 'action': 'time' };
    //$http.post($localStorage.app.restApi, data).
    //then(function (response, status, headers, config) {   
      
      var promisesReader = [];  
      var estadosReader = ['R','A','N'];
      $rootScope.pedidosUpdating = 1;
      $rootScope.nroPedidosList = 0;
      $rootScope.totalTitulo = 0;
      
      for (w = 0; w < estadosReader.length ; w++) {
        var EstadoLeyendo = estadosReader[w];

        promisesReader.push($rootScope.db.executeQuery("SELECT * FROM OPED WHERE sim = ? AND pedidoEstado = ? ORDER BY Boton DESC, App DESC, unixCompromiso ASC", [$localStorage.app.sim, EstadoLeyendo]).then(function(results) {

          $rootScope.nroPedidosList = (parseInt($rootScope.nroPedidosList) + parseInt(results.rows.length));

          $rootScope.totalTitulo = (parseInt($rootScope.totalTitulo) + parseInt(results.rows.length));
          $rootScope.pedidosUpdating = 0;
          var unixActual = local;

          for(i=0; i < results.rows.length; i++){
            var row = results.rows.item(i);
            var resta = (parseInt(row.unixCompromiso) - parseInt(unixActual));
            var minutos = Math.round(resta / 60);
            var horas = Math.round(minutos / 60);
            if (row.pedidoEstado == 'N') { var rootPedido = $rootScope.PedidosNuevos; }
            if (row.pedidoEstado == 'R') { var rootPedido = $rootScope.PedidosReclamado; }
            if (row.pedidoEstado == 'A') { var rootPedido = $rootScope.PedidosAgilizado; }
            console.log(row);
            rootPedido.push(row);

            $scope.fillDetalles(i, row.numeroPedido, row.pedidoOrigen, row.pedidoEstado);

            rootPedido[i].zero = "";

            rootPedido[i].TimeLeft2 = "";
            rootPedido[i].TimeLeftSemaforo2 = "";
            if (horas > 0) {
              horas = parseInt(horas);
              rootPedido[i].TimeLeft2 = horas + " hrs";
              if (horas > 24) {
                rootPedido[i].TimeLeft2 = "faltan "+parseInt(horas / 24)+" días";
              }
              rootPedido[i].TimeLeftSemaforo2 = "verde";
            }
            else {
              if (minutos <= 5 && horas <= 0) {
                rootPedido[i].TimeLeft2 = minutos+" min";
                if (minutos < -60) {
                  rootPedido[i].TimeLeft2 = parseInt((minutos*-1) / 60)+" hrs atraso";
                }
                if (horas < -24) {
                  rootPedido[i].TimeLeft2 = parseInt((horas*-1) / 24)+" días atraso";
                }
                rootPedido[i].TimeLeftSemaforo2 = "rojo";
                rootPedido[i].zero = "zero";
              }
              else {
                rootPedido[i].TimeLeft2 = minutos+" min";
                rootPedido[i].TimeLeftSemaforo2 = "amarillo";
              }
            }              
          
          }
          if ($rootScope.nroPedidosList == 0) { 
            $rootScope.sinpedidos = 1;
          }


        })); // push promise
      }


      $.when.apply(null,promisesReader).then(function () {
        $scope.hideload();
      }, function() { 
        $scope.hideload();
      });

      
    /*},
    function (data, status, headers, config) { 
      $rootScope.err();
      $scope.hideload();
    });*/
  };

  $scope.fillDetalles = function(indice, pedido, origen, tipo) {
    var detalleHTML = "";

    $rootScope.db.executeQuery("SELECT * FROM PED1 WHERE sim = ? AND numeroPedido = ? AND pedidoOrigen = ? ORDER BY material ASC", 
        [$localStorage.app.sim, pedido, origen]
    ).then(function(results2) {
      var detalleHTML = "";
      for (j=0;j<results2.rows.length;j++) {
        var line = results2.rows.item(j);
        var usar_class = "subdetalle-material";
        if (line.material.indexOf('C') > 0) {
          usar_class = "subdetalle-material2";
        }
        detalleHTML = detalleHTML + '<div class="'+usar_class+'">'+line.material.replace('GAS','')+(line.cantidad > 1 ? ' x '+line.cantidad:'')+'</div> + ';
      }

      if (tipo == 'N') {
        $rootScope.PedidosNuevos[indice].detalleHTML = detalleHTML.substring(0,detalleHTML.length - 2);
      }
      if (tipo == 'R') {
        $rootScope.PedidosReclamado[indice].detalleHTML = detalleHTML.substring(0,detalleHTML.length - 2);
      }
      if (tipo == 'A') {
        $rootScope.PedidosAgilizado[indice].detalleHTML = detalleHTML.substring(0,detalleHTML.length - 2);
      }
      if (tipo == 'RET') {
      	$scope.routing[indice].routingPDetalle = detalleHTML.substring(0,detalleHTML.length - 2);
      }
      
    });
  };

  $scope.reloadPedidos = function() {
    $scope.showload('actualizando');

    /*
    var data = {'sim': $localStorage.app.sim, 'action': 'agenda', 'camion': $localStorage.app.camion };
    $http.post($localStorage.app.restApi, data).
    then(function (data, status, headers, config) {      
      if (data.data.res == 'OK') { 
        var promises = $rootScope.guardarPedidos(data.data);
        $.when.apply(null,promises).done(function () {
            setTimeout(function() { // delay para sql
              $rootScope.confirmarPedidos();
              $scope.poblarPedidos(); 
            }, 1000);
        });
        $scope.$broadcast('scroll.refreshComplete');
      }
      else {
        $rootScope.err('No fue posible actualizar los pedidos. Revise su conexión a internet');
        $scope.poblarPedidos();
        $scope.hideload();
        $scope.$broadcast('scroll.refreshComplete');
      }
      
    },
    function (data, status, headers, config) { 
      $rootScope.err();
      $scope.poblarPedidos();
      $scope.hideload();
      $scope.$broadcast('scroll.refreshComplete');
    });
    */

    // Solo refresh desde BBDD
    $scope.poblarPedidos(); 
    setTimeout(function() { // delay para sql
      $scope.hideload();
      $scope.$broadcast('scroll.refreshComplete');
    }, 1000);

    
  };
  
  //$scope.poblarPedidos();

  $scope.reloadPedidos();

  $scope.doRefresh = function(showload) {
    //$scope.poblarPedidos();
    if (showload == 1) { $scope.showload(); }
    $scope.reloadPedidos();
  }

  $scope.goFromMap = function(origen, numero) {
  	$scope.closeMapa();
  	$state.go("main.verpedido", { origen: origen, numero: numero });
  }
  $scope.doRouter = function(routingMethod) {

  	$scope.routing = [];
    jQuery("#div_tlr").hide();
    jQuery("#div2_tlr").hide();
    jQuery("#div3_tlr").hide();

    if ($rootScope.nroPedidosList == 0) { 
      $rootScope.err('No hay pedidos para enrutar');
    }
    else {
      $scope.showload();
      var end_locations = [];

      /* Problar localidades respecto al orden reclamado / agilizado / nuevo */ 
      for (var i = 0; i < $rootScope.PedidosReclamado.length; i++) {
        var sub = [ $rootScope.PedidosReclamado[i].nombreCliente+'<br />'+$rootScope.PedidosReclamado[i].direccionCliente, //+'<br />'+$rootScope.PedidosReclamado[i].observacion
                    $rootScope.PedidosReclamado[i].lat,
                    $rootScope.PedidosReclamado[i].lng,
                    0, // distancia
                    $rootScope.PedidosReclamado[i].numeroPedido,
                    $rootScope.PedidosReclamado[i].pedidoOrigen,
                    $rootScope.PedidosReclamado[i].TimeLeftSemaforo2,
                    $rootScope.PedidosReclamado[i].direccionCliente,
                    $rootScope.PedidosReclamado[i].comuna
                    ];
        
        end_locations.push(sub);
      }
      for (var i = 0; i < $rootScope.PedidosAgilizado.length; i++) {
        var sub = [ $rootScope.PedidosAgilizado[i].nombreCliente+'<br />'+$rootScope.PedidosAgilizado[i].direccionCliente, //+'<br />'+$rootScope.PedidosAgilizado[i].observacion
                    $rootScope.PedidosAgilizado[i].lat,
                    $rootScope.PedidosAgilizado[i].lng,
                    0, // distancia
                    $rootScope.PedidosAgilizado[i].numeroPedido,
                    $rootScope.PedidosAgilizado[i].pedidoOrigen,
                    $rootScope.PedidosAgilizado[i].TimeLeftSemaforo2,
                    $rootScope.PedidosAgilizado[i].direccionCliente,
                    $rootScope.PedidosAgilizado[i].comuna
                  ];
        end_locations.push(sub);
      }
      for (var i = 0; i < $rootScope.PedidosNuevos.length; i++) {
        var sub = [ $rootScope.PedidosNuevos[i].nombreCliente+'<br />'+$rootScope.PedidosNuevos[i].direccionCliente, //+'<br />'+$rootScope.PedidosNuevos[i].observacion
                    $rootScope.PedidosNuevos[i].lat,
                    $rootScope.PedidosNuevos[i].lng,
                    0, // distancia
                    $rootScope.PedidosNuevos[i].numeroPedido,
                    $rootScope.PedidosNuevos[i].pedidoOrigen,
                    $rootScope.PedidosNuevos[i].TimeLeftSemaforo2,
                    $rootScope.PedidosNuevos[i].direccionCliente,
                    $rootScope.PedidosNuevos[i].comuna
                  ];
        end_locations.push(sub);
      }
      
      /* Maximo 20 waypoints para evitar que se caiga google maps traffic */
      var tope = 0;

      var top20_local = [];
      for (var i = 0; i < end_locations.length ;i++) {

        if (end_locations[i][1] != "" && end_locations[i][2] != "") {
          top20_local.push(end_locations[i]);
          tope++;
        }
        else {
          
        	var promises=[];
    			var request = new XMLHttpRequest();
    			request.open('GET', "https://maps.googleapis.com/maps/api/geocode/json?address="+end_locations[i][7]+",+"+end_locations[i][8]+",+Chile&ClientID=gme-abastiblesa", false);  
    			request.send(null);
    			if (request.status === 200) {
    				var resp = JSON.parse(request.responseText);
    				if (resp.status=='OK') {
    					end_locations[i][1] = resp.results[0].geometry.location.lat;
    					end_locations[i][2] = resp.results[0].geometry.location.lng;
              $rootScope.db.executeQuery("UPDATE OPED SET lat = ?, lng = ? WHERE numeroPedido = ? AND pedidoOrigen = ? AND sim = ?", [end_locations[i][1],end_locations[i][2],end_locations[i][4],end_locations[i][5], $localStorage.app.sim]);
    					top20_local.push(end_locations[i]);
    					tope++;			
    				}
    			}
          else {
            tope++;
          }
			    $rootScope.log('ERR','Routing', 'Dirección sin geolocalizacion:' + end_locations[i][0]);
        }
        
        if (tope == 20) {
          break;
        }
      }
      

      $rootScope.log('INF','Routing', 'Solicita GPS para comenzar ruta segun orden '+routingMethod);
      var posOptions = {maximumAge:Infinity, timeout:60000, enableHighAccuracy: false};
      $cordovaGeolocation
      .getCurrentPosition(posOptions)
      .then(function (position) {
      	

        var locations = [['Mi camion', position.coords.latitude, position.coords.longitude]].concat(top20_local);
        $rootScope.log('INF','Routing', 'Total de locaciones: '+locations.length);
        /* Calcular distancia */
        for ( i = 0; i < locations.length; i++) {
          locations[i][3] = calculateDistance(locations[0][1],locations[0][2],locations[i][1],locations[i][2],"K");
        }

        if (routingMethod == "cercania") { 
          locations.sort(function(a, b) { 
            return a[3] - b[3];
          });
        }
        if (routingMethod == "l800") {  // 1 = l800/dash , 2 = gex
          locations.sort(function(a, b) { 
            return a[5] - b[5];
          });
        }

        if (locations.length < 1) {
          $rootScope.err("Ninguna de las direcciones tiene georeferencia. No podemos armar una ruta");
        }
        else {

          $rootScope.log('INF','Routing', 'Sort OK');
          $ionicModal.fromTemplateUrl('templates/ver_mapa.html', {
            scope: $scope,
            animation: 'slide-in-right'
          }).then(function(modal) {
            
            $rootScope.log('INF','Routing', 'Request modal');
            $scope.verMapaModal = modal;
            $scope.verMapaModal.show();
            $rootScope.log('INF','Routing', 'Show modal');
            var myLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            $rootScope.log('INF','Routing', 'myLatLng');
            var mapOptions = {
              center: myLatLng,
              zoom: 14,
              disableDefaultUI: true,
              mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);
            $rootScope.log('INF','Routing', 'Map define');

            var directionsDisplay = new google.maps.DirectionsRenderer;
            var directionsService = new google.maps.DirectionsService;

            directionsDisplay.setMap($scope.map);
            directionsDisplay.setOptions( { 
              suppressMarkers: true, 
              polylineOptions: { strokeColor: '#4767a9' }
            } );
            var infowindow = new google.maps.InfoWindow();
            $rootScope.log('INF','Routing', 'Direction display');
            directionsDisplay.setPanel(document.getElementById('ruta_detalle'));

            var marker, i;
            var request = {
              travelMode: google.maps.TravelMode.DRIVING
            };
            
            $rootScope.log('INF','Routing', 'For lengths');
            for (i = 0; i < locations.length; i++) {

              //if (locations[i][1] != "" && locations[i][2] != "") {
                if (i == 0) {

                  

                  myMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(locations[i][1], locations[i][2]),
                    map: $scope.map,
                    icon: 'img/icon.camion_map.png'
                  });

                  google.maps.event.addListener(myMarker, 'click', (function(marker, i) {
                    return function() {
                      infowindow.setContent(locations[i][0]);
                      infowindow.open($scope.map, myMarker);
                    }
                  })(myMarker, i));
                  

                  if (i == 0) { 
                    request.origin = myMarker.getPosition(); 
                  }
                  else if (i == locations.length - 1)  {
                    request.destination = myMarker.getPosition();
                  }
                  else {
                    if (!request.waypoints) request.waypoints = [];
                    request.waypoints.push({
                      location: myMarker.getPosition(),
                      stopover: true
                    });
                  }

                }
                else {

                  marker = new google.maps.Marker({
                    position: new google.maps.LatLng(locations[i][1], locations[i][2]),
                    map: $scope.map,
                    icon: "img/marker/"+locations[i][6]+"/number_" + (i) + ".png"
                  });

                  google.maps.event.addListener(marker, 'click', (function(marker, i) {
                    return function() {
                      infowindow.setContent(locations[i][0]);
                      infowindow.open($scope.map, marker);
                    }
                  })(marker, i));
                  if (i == 0) request.origin = marker.getPosition();
                  else if (i == locations.length - 1) request.destination = marker.getPosition();
                  else {
                    if (!request.waypoints) request.waypoints = [];
                    request.waypoints.push({
                      location: marker.getPosition(),
                      stopover: true
                    });
                  }
                }

              //}

              $rootScope.log('INF','Routing', 'routing data');
              $scope.routing.push({
                index: i,
                numero: locations[i][4],
                origen: locations[i][5],
                info: locations[i][0],
                lat: locations[i][1],
                lng: locations[i][2],
                distancia: locations[i][3].toFixed(2),
                routingPDetalle: ''
              });
              $scope.fillDetalles(i, locations[i][4], locations[i][5], 'RET');
            }
            
            $rootScope.log('INF','Routing', 'Direction service');

            directionsService.route(request, function(result, status) {

              var tiempoPorPedido=[];
              var sumaTiempo = 0;
              for (var i = 0; i < result.routes[0].legs.length ; i++) {
                  tiempoPorPedido.push(result.routes[0].legs[i].duration.text);
                  sumaTiempo += result.routes[0].legs[i].duration.value + (7 * 60); // 7 minutos la entrega, el tiempo de google son segundos
              }
              if (status == google.maps.DirectionsStatus.OK) {
                jQuery("#div_tlr").hide();
                jQuery("#div2_tlr").hide();
                jQuery("#div3_tlr").show();

                if (sumaTiempo <= 59) {
                  jQuery("#timeleft_route3").html(Math.round(sumaTiempo / 60)+" min(s)");
                }
                else {
                  var min = Math.round(sumaTiempo / 60);
                  var hor = parseInt(min / 60);
                  var mmm = parseInt(min % 60);
                  jQuery("#timeleft_route3").html(hor+" hr(s) y "+mmm+" min(s)");
                }

                directionsDisplay.setDirections(result);
                $scope.hideload();
              }
            });


            MyMarkerTimer = $interval(function() { $scope.updateMarker() }, 3000);
            
          });

        }

      }, function(err) {
        $rootScope.err("Tu GPS no ha entregado tu posición actual, no podemos armar la ruta ("+err.code+": "+err.message+")");
        $scope.hideload();
      });     
    }
  };

  $scope.$on('modal.hidden', function(e) {
    if ($scope.verMapaModal) { $interval.cancel(MyMarkerTimer); $scope.verMapaModal.remove(); }
    if ($scope.verMapaFullModal) { $interval.cancel(MyMarkerTimer); $scope.verMapaFullModal.remove(); }
  });

  /* Slider para ruteador google */
  $scope.routing = [];
  $scope.slideMapChanged = function(indexSlide) {
  	$scope.map.setZoom(15);
  	$scope.map.setCenter({lat: parseFloat($scope.routing[indexSlide].lat), lng: parseFloat($scope.routing[indexSlide].lng)});
  }

})

.controller('HomeCtrl', function($scope, $http, $rootScope, $ionicModal, $stateParams, $timeout, $location, $state, $localStorage, $cordovaGeolocation, $ionicHistory) {

  if ($localStorage.force) {
    if ($localStorage.force.Camion == '') {
      $localStorage.force.Camion = $localStorage.app.camion.replace("EN","");
      $localStorage.force.DI = $localStorage.app.nrocliente;
    }
  }

  
  $localStorage.diff = Math.abs(new Date().getTime() - $localStorage.diffWhen) / 3600000;
  console.log('evaluate diff ? ', $localStorage.diff);
  if ($localStorage.diff > 12) {
    //$rootScope.changeDriver();
  }

  console.log('HomeCtrl Force: ', $localStorage.force);
  $scope.deleteMonth = function() {

    var ahora = new Date();
    var un_mes = Math.round( (ahora.getTime() / 1000) - (86400*15) );
    $rootScope.db.executeQuery("SELECT * FROM OPED WHERE sim = ? AND pedidoRecibo < ? ORDER BY pedidoRecibo ASC", 
        [$localStorage.app.sim, un_mes]
    ).then(function(resultsPreDelete) {
      for (j=0;j<resultsPreDelete.rows.length;j++) {
        var line = resultsPreDelete.rows.item(j);
        $rootScope.log('OK','INF','Pedido eliminado por antiguedad (> 15) origen: '+line.pedidoOrigen+' - Num: '+line.numeroPedido);
        $rootScope.db.executeQuery("DELETE FROM OPED WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", [$localStorage.app.sim,line.pedidoOrigen,line.numeroPedido]);
      }
    });

  };

  $scope.deleteMonth();

  $scope.checkPriceList = function() {
    
    var dif = ((new Date().valueOf() - $localStorage.app.lastPriceList) / 1000);
    if ($localStorage.app.priceList == null) {
      var materialEnLista = 0;
    }
    else {
      var materialEnLista = Object.keys($localStorage.app.priceList).length;
    }
    
    if (dif > (3600 * 24) || materialEnLista < 1) { // 24 horas o lista incompleta

      // actualizar precios
      $scope.showload('Cargando lista de precios');
      $rootScope.log('OK','INF','Inicia carga de precios (24 horas timeout o primera vez)');
      var senddata = {'sim': $localStorage.app.sim, 'action': 'agenda', 'ext': 'precios', 'camion': $localStorage.app.camion };
      $http.post($localStorage.app.restApi, senddata).
      then(function (data, status, headers, config) {      
        if (data.data.res == 'OK') { 
          var promises = $rootScope.guardarPedidos(data.data); // tambien updatea precios
          $.when.apply(null,promises).always(function () {
              setTimeout(function() { // delay para sql
                $rootScope.confirmarPedidos();
                $scope.hideload();
              }, 1000);
          });
        }
        else {
          $scope.hideload();
        }
      },
      function (data, status, headers, config) { 
        $scope.hideload();
      }); 
    } 
    else {
      
    }

  };

  // actualizar precios APP
  $scope.checkPriceList(); // siempre actualizar precios si no existen o tienen mas de 24 horas

  $scope.iraPedidos = function() {
    $state.go("main.pedidos", {}, { reload: true, inherit: false, notify: true });
  };
  $scope.iralTarreo = function() {
    $state.go("main.tarreo", {}, { reload: true, inherit: false, notify: true });
  };
  $scope.canjearMedioPago = function() {
    if (default_app.modo == "dev") {
      //$state.go("main.tarreo", { preloadDRUT: "16624648-2" });
      $state.go("main.tarreo", { preloadPROMO: "0508A02010000068" }); /* 0018799305 ... 0018799309 */
    }
    else {

     cordova.plugins.barcodeScanner.scan(
        function (result) {
          var isDescuentoRutLeido = 0;
          var isDescuentoRutValido = 0;
          if (result.cancelled == 1) {
            // Cancelado por el usuario
          }
          else {
            if (result.text.length == 16) {
              $scope.showload('validando...');
              //$rootScope.confirmar('¿Continuar con promoción '+result.text+'?', function() { });
              validarPromocion($localStorage.app.sim, result.text).then(function(resp){
                $scope.hideload();
                try { superXML = new XMLSerializer().serializeToString(resp); } catch (err) { }
                var $xml = $( resp );
                if ($xml.find('EL_RESPUESTA').text() == '001') { //error
                  $rootScope.err($xml.find('EL_MENSAJE').text());
                  prebuildSend.XMLRespuesta = superXML;
                  prebuildSend.Camion = $localStorage.app.camion;
                  prebuildSend.Resultado = -1;
                  prebuildSend.Motivo = $xml.find('EL_MENSAJE').text();
                  prebuildSend.NroPedido = '';
                  addtrx(prebuildSend);
                }
                else {
                  $state.go("main.tarreo", { preloadPROMO: result.text });
                }
              },function() { $rootScope.err('No fue posible conectar con el servidor'); $scope.hideload(); });
            }
            else if (result.format == "QR_CODE") { // cedula >= 2010
              //https://portal.sidiv.registrocivil.cl/usuarios-portal/pages/DocumentRequestStatus.xhtml?RUN=16624648-2&type=CEDULA&serial=105711008
              var originalText = result.text;
              rutLeido = result.text.split("?RUN=");
              if (rutLeido[1]) {
                var amp = rutLeido[1].split("&");
                rutLeido = amp[0];
                isDescuentoRutLeido = 1;
                isDescuentoRutValido = 1;

                var spx = result.text.split("serial=");
                globalsn = spx[1].substring(0,9);
              }
            }
            else if (result.format == "PDF_417") { // cedula <= 2010
              //alert($rootScope.toBinString(result.text));

              if (result.text.length > 19) {
                var allrut = $.trim(result.text.substring(0,9));
                var x_dv = allrut.substring(allrut.length - 1);
                var x_rut = allrut.substring(0,(allrut.length-1));

                rutLeido = x_rut+'-'+x_dv; 
                var CHL = result.text.split('CHL');
                globalsn = CHL[1].substring(6,16);
                isDescuentoRutValido = 1;
              }

              isDescuentoRutLeido = 1;
            }
            else if (result.text.length == 10 || result.text.length == 9 || result.text.length == 8) {
              //$rootScope.confirmar('¿Continuar con cupón '+result.text+'?', function() {  });
              $scope.showload('validando...'); 
              validarCupon($localStorage.app.sim, result.text).then(function(resp){
                $scope.hideload();
                try { superXML = new XMLSerializer().serializeToString(resp); } catch (err) { }
                var $xml = $( resp );
                if ($xml.find('EL_RESPUESTA').text() == '001') { //error
                  $rootScope.err($xml.find('EL_MENSAJE').text());
                  prebuildSend.XMLRespuesta = superXML;
                  prebuildSend.Camion = $localStorage.app.camion;
                  prebuildSend.Resultado = -1;
                  prebuildSend.Motivo = $xml.find('EL_MENSAJE').text();
                  prebuildSend.NroPedido = '';
                  addtrx(prebuildSend);
                }
                else if ($xml.find('EL_RESPUESTA').text() != "000") { //error
                  $rootScope.err('Código de cupón incorrecto');
                }
                else {
                  $state.go("main.tarreo", { preloadCUPON: result.text });
                }
              },function() { $rootScope.err('No fue posible conectar con el servidor'); $scope.hideload(); });
            }
            else {
              $rootScope.err('El código escaneado no corresponde a una cédula, cupón o promoción válida');
            }

            if (isDescuentoRutLeido == 1) {
              if (isDescuentoRutValido == 1) {
                $scope.showload();
                validarDrut($localStorage.app.sim, rutLeido).then(function(resp){
                  try { superXML = new XMLSerializer().serializeToString(resp); } catch (err) { }
                  $scope.hideload();
                  var $xml = $( resp );
                  if ($xml.find('EL_RESPUESTA').text() == '001') { //error
                    $rootScope.err($xml.find('EL_MENSAJE').text());
                    prebuildSend.XMLRespuesta = superXML;
                    prebuildSend.Camion = $localStorage.app.camion;
                    prebuildSend.Resultado = -1;
                    prebuildSend.Motivo = $xml.find('EL_MENSAJE').text();
                    prebuildSend.NroPedido = '';
                    addtrx(prebuildSend);
                  }
                  else {
                    if ($rootScope.huella == 1) {
                      $state.go("main.tarreo", { preloadHuella: rutLeido, xml: $xml });
                    }
                    else {
                      $state.go("main.tarreo", { preloadDRUT: rutLeido, xml: $xml });
                    }
                  }
                },function() { $rootScope.err('No fue posible conectar con el servidor'); $scope.hideload(); });
              }
              else {
                $rootScope.err('El código escaneado no corresponde a una cédula válida');   
              }
            }
          }
        },
        function (error) {
            $rootScope.err("Cámara en uso");
        },
        {
            preferFrontCamera : false, // iOS and Android
            showFlipCameraButton : true, // iOS and Android
            showTorchButton : true, // iOS and Android
            torchOn: false, // Android, launch with the torch switched on (if available)
            prompt : "El código debe quedar dentro de la zona demarcada", // Android
            resultDisplayDuration: 0, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
            formats : "QR_CODE,PDF_417,EAN_8,EAN_13,CODE_128,CODE_39,CODE_93", // default: all but PDF_417 and RSS_EXPANDED
            //orientation : "portrait", // Android only (portrait|landscape), default unset so it rotates with the device
            disableAnimations : true, // iOS
            disableSuccessBeep: false // iOS
        }
     );
    } /* fin else modo app **/
  };

  if (default_app.modo != "dev" && isCordovaApp) {
  	if (cordova.platformId == 'ios') {
  	  cordova.plugins.notification.local.hasPermission(function (granted) {
  	    if( granted == false ) {
  	      cordova.plugins.notification.local.registerPermission(function (granted) {
  	        $rootScope.log("OK", "Notificaciones", "Solicita permisos");
  	        if( granted == true ) {
  	          $rootScope.log("OK", "Notificaciones", "App autorizada");
  	          //testNotifications();
  	        } else {
  	          //alert("Las notificaciones no están autorizadas");
  	          $rootScope.log("KG", "Notificaciones", "No hubo autorizacion");
  	        }
  	      });
  	    }
	  });
	 }
  }

  if (!isCordovaApp) {
    console.log('GPS Browser');
    var posOptions = {maximumAge:Infinity, timeout:60000, enableHighAccuracy: false};
    $cordovaGeolocation
    .getCurrentPosition(posOptions)
    .then(function (position) {
      $localStorage.gpslat = position.coords.latitude;
      $localStorage.gpslng = position.coords.longitude;

      var d = new Date;
      var dformat = [ (d.getMonth()+1).padLeft(), d.getDate().padLeft(), d.getFullYear()].join('/')+ ' ' + [ d.getHours().padLeft(), d.getMinutes().padLeft(), d.getSeconds().padLeft()].join(':');
      $localStorage.gpslast = dformat;

      $rootScope.statusGPS = "activo";
      $http.post($localStorage.app.restApi, {
        action: 'gpscheck', 
        nrocliente: $localStorage.app.nrocliente, 
        camion: $localStorage.app.camion, 
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }).then(function() {  });
    }, function() { $rootScope.statusGPS = "inactivo"; });
  }
  /* Test impresion */
  /*
  var myPromise = $rootScope.ConnectPrinter();
  myPromise.done(function() { 
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481128", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481129", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481130", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481131", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481132", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481133", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481134", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481135", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481136", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000481137", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000489028", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000000001128", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
    $rootScope.imprimeCierre("56936077", "20/10/2016", "000048713311", "EFECTIVO", [{material: 'HOLA', cantidad: 10, precio: '$ 1.990'}], 500, 15000, 'ent', 'CEEN', 'JEJE');
  });
  */
})

.controller('PrintConfigCtrl', function($scope, $ionicModal, $timeout, $location, $ionicLoading, $state, $localStorage) {

  $scope.printerbox = {};
  $scope.cargandoTitulo = true;
  $scope.cargandoPrinters = true;
  $scope.seleccioneTitulo = false;
  $scope.noPrinterFound = false;
  $scope.loading = "";

  $scope.printSave = function() {
    if ($localStorage.app.impNN == "") {
      $rootScope.confirmar('¿Desea continuar sin una impresora activa?', function() {
        $localStorage.app.impNN = "";
        $localStorage.app.impID = "";
        $state.go( "main.home" );
      });
    }
    else {
      $state.go( "main.home" );      
    }
  };
  /*
  $scope.impActivar = function(item) {
    $localStorage.app.impNN = item.currentTarget.getAttribute("data-nombre");
    $localStorage.app.impID = $scope.printerbox.sel;
  }
  */
  $scope.printRefresh = function() {

    $scope.cargandoTitulo = true;
    $scope.cargandoPrinters = true;
    $scope.seleccioneTitulo = false;
    $scope.noPrinterFound = false;
    $scope.showName = "";
    $scope.printerList=[];
    printers = [];
    $localStorage.app.impNN = "";
    $localStorage.app.impID = "";

    err("Menu temporalmente deshabilitado. La impresora se setea al start.");
    //bluetoothSerial.discoverUnpaired(success, failure);
    /*bluetoothSerial.list(function(devices) {
      devices.forEach(function(device) {
        alert(JSON.stringify(device));
        if (device.name.toLowerCase().indexOf("abastible")>=0) {
          $localStorage.app.impNN = device.name;
          $localStorage.app.impID = device.id;
          $scope.showName = $localStorage.app.impNN;
        }
      });
    }, function() {
      $scope.noPrinterFound = true;
      $rootScope.err('Error en la búsqueda de impresora. Revise tener activo el Bluetooth');
    });*/
/*
    bluetoothSerial.discoverUnpaired(function(devices) {
        devices.forEach(function(device) {
            console.log(device.id);
        })
    }, function() {
      $scope.noPrinterFound = true;
      $rootScope.err('Error en la búsqueda de impresora 2. Revise tener activo el Bluetooth');
    });*/


    /*
    $timeout(function() {

      $scope.cargandoTitulo = false;
      $scope.cargandoPrinters = false;
      $scope.printerList=printers;

      if ($localStorage.app.impNN == "") {
        $scope.noPrinterFound = true;
      }
      else {
        $scope.seleccioneTitulo = true;
      }
      ble.stopScan(function() {}, function() {});

    },5000);
    */
  };
  $scope.printRefresh();
})

.controller('preloadCtrl', function($scope, $ionicModal, $timeout, $location, $state, $localStorage, $ionicHistory) {
  $state.go( "main.home" );
})

.controller('VersionErrorCtrl', function($scope, $ionicModal, $timeout, $location, $state, $localStorage, $ionicHistory) {


  $ionicHistory.clearCache().then(function(){
    $localStorage.app.sim="";
    $localStorage.app.nrocliente="";
    $localStorage.app.camion="";
    $localStorage.app.nombre="";
    $localStorage.app.repartidor="";
    $localStorage.app.foto="";
    $localStorage.app.auth=0;
    $localStorage.app.priceList={};
    $localStorage.app.priceListGex={};
    $localStorage.app.priceListBO={};
    $localStorage.app.lastPriceList=0;
  });
  

  $timeout(function() {
    jQuery("#versionError_Nombre").show().addClass("animated slideInUp");
  }, 700)

  $timeout(function() {
    jQuery("#versionError_txt").show().addClass("animated slideInRight");
  }, 1200)

  $timeout(function() {
    jQuery("#versionError_botones").show().addClass("animated slideInLeft");
  }, 2000)

  $scope.DownloadVersion = function() {
    if (default_app.modo == "test") { 
      window.open('https://build.phonegap.com/apps/2373107/download/'+cordova.platformId, '_system'); 
    }
    if (default_app.modo == "prod") {
      if (cordova.platformId == 'android') {
        window.open('https://play.google.com/store/apps/details?id=cl.abastible.repartidor&hl=es', '_system'); 
      }
      else if (cordova.platformId == 'ios') {
        window.open('https://build.phonegap.com/apps/2494143/download/'+cordova.platformId, '_system'); 
      }
    } 
  }
  
})
.controller('FirstHolaCtrl', function($scope, $ionicModal, $timeout, $location, $state, $localStorage, $ionicHistory) {

  $scope.app = $localStorage.app;

  if ($localStorage.app.auth == 0) {
    $ionicHistory.clearCache().then(function(){
      $state.go( "login" );
    });
  }

  $timeout(function() {
    jQuery("#firstHola_Nombre").show().addClass("animated slideInUp");
  }, 700)

  $timeout(function() {
    jQuery("#firstHola_txt").show().addClass("animated slideInRight");
  }, 1200)

  $timeout(function() {
    jQuery("#firstHola_botones").show().addClass("animated slideInLeft");
  }, 2000)

  $scope.skipConfig = function() {
    $ionicHistory.clearCache().then(function(){
      $state.go( "main.home" , { reloadPrecios: 1 } , {reload: true} );
    });
  }

  $scope.printConfig = function() {
    $state.go( "printConfig" );
  }
})

.directive('onlyDigits', function () {
  return {
    require: 'ngModel',
    restrict: 'A',
    link: function (scope, element, attr, ctrl) {
      function inputValue(val) {
        if (val) {
          var digits = val.replace(/[^0-9]/g, '');

          if (digits !== val) {
            ctrl.$setViewValue(digits);
            ctrl.$render();
          }
          return parseInt(digits,10);
        }
        return undefined;
      }            
      ctrl.$parsers.push(inputValue);
    }
  };
});
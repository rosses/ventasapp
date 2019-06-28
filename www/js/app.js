/* Configuracion */
default_app = {
    modo:"prod", //dev - test - prod
    //restApi:"https://test.familianaranja.com/appRepartidor/rest_api",
    //restApp:"http://test.familianaranja.com/api-v2",
    restApi: "http://www.bligoeventos.com",
    restApp:"http://app.abastible.cl/api-v2",
    //impID: "",
    gexIs: 0,
    impNN: "",
    impSERV: "18F0",
    impCHAR: "2AF1",
    sim: "",
    nrocliente: "",
    camion: "",
    nombre: "",
    repartidor: "",
    foto: "",
    auth: 0,
    priceList: {},
    priceListGex: {},
    priceListBO: {},
    timezone: 0, // default se actualiza por rest
    lastPriceList: 0,
    wsdash: "http://www.enlanube.cl/dash/dash/DocumentContentService/WSpda?wsdl",
    wsgex: "http://apprepartidor.abastible.cl:8080/erpdistribuidorWS/wsdl/erpdistWS.wsdl?wsdl"
    //wsdash: "http://www.enlanube.cl/dashtest/dash/DocumentContentService/WSpda?wsdl",
    //wsgex: "http://apprepartidortest.abastible.cl:8080/erpdistribuidorWS/wsdl/erpdistWS.wsdl?wsdl",
    //wsgex: "http://www.abastible.cl/gextest/erpdistribuidorWS/wsdl/erpdistWS.wsdl?wsdl"
    //wsgex: "http://apprepartidor.abastible.cl:8080/erpdistribuidorWS/wsdl/erpdistWS.wsdl?wsdl"
};

var mstrdev = {
  PEMA: {id: 214, descripcion: 'Pendiente Mal Asignado'},
  PEAD: {id: 216, descripcion: 'Pendiente Aclarar Direccion'},
  PECC: {id: 218, descripcion: 'Pendiente Casa Cerrada'},
  PESD: {id: 220, descripcion: 'Pendiente Sin Dinero'},
  PSSC: {id: 222, descripcion: 'Pendiente Sin Cil. Solic'},
  CEEN: {id: 224, descripcion: 'Cerrado Entregado'},
  CEAN: {id: 226, descripcion: 'Cerrado Anulado'},
  CEAC: {id: 228, descripcion: 'Cerrado Atendido otra Compania'}
};

var printers = [];
var mat = ["GAS05N","GAS11N","GAS15N","GAS45N","GAS15VM","GAS15VMA","GAS05C","GAS11C","GAS15C","GAS45C"];
var myMarker = ""; // variable global posicion actual marcador google maps
var MyMarkerTimer = "";
var delayRevisarPedidos = null;
var delayRevisarPedidosLock = null;
var delayCheckGPS = null;
var delayCheckVersion = null;
var mediosOK = [];
var mediosERR = [];
var recursiveProtection = 0;
var globalsn = "";
// Acerca de los modos 
/*
DEV: 
> Emula datos falsos donde la respuesta dependa del hardware
> Scanner de cedula, promociones y cupones es un input
> Sustituye notification dialog por dialogos comunes del navegador

TEST:
> Utiliza caracteristicas del hardware
> Compara version test de rest_api

PROD:
> Utiliza caracteristicas del hardware
> Compara version prod de rest_api
*/
var acciona = "";
angular.module('abastible', ['ngCordova', 'base64', 'angular-websql', 'ionic', 'abastible.controllers', 'ngStorage', 'slickCarousel', 'firebase'])

.run(function($rootScope,$ionicPlatform,$ionicHistory, $ionicPopup, $ionicSideMenuDelegate,$localStorage,$cordovaGeolocation,$state,$timeout,$http,$ionicLoading) {

  if (!$localStorage.app) {
    $localStorage.app = default_app;
  }
  $localStorage.diff = 36;
  var dt = new Date();
  dt.setDate( dt.getDate() - 2 ); // 2 dias
  $localStorage.diffWhen = dt.getTime();

  $localStorage.abaTerrenoVersion = 1231;
  $localStorage.abaTerrenoModoLog = 0;
  $rootScope.abaTerrenoAmbiente = "PROD";

  $rootScope.phoneMode = "wakeup";
  $localStorage.aba_printer = "";
  $localStorage.aba_name = "";

  $localStorage.gpslat = "0";
  $localStorage.gpslng = "0";
  $localStorage.gpslast = "0";

  $rootScope.step2DRUT = {}; // puede usar preguntas

  if (!$localStorage.force) {
    console.log('force created');
    $localStorage.force = {
      DI: '',
      Camion: ''
    };
  } else {
    console.log('force skipped, already exists');
  }

  $rootScope.toBinString = function(arr) {
    var uarr = new Uint8Array(arr.map(function(x){return parseInt(x,2)}));
    var strings = [], chunksize = 0xffff;
    // There is a maximum stack size. We cannot call String.fromCharCode with as many arguments as we want
    for (var i=0; i*chunksize < uarr.length; i++){
        strings.push(String.fromCharCode.apply(null, uarr.subarray(i*chunksize, (i+1)*chunksize)));
    }
    return strings.join('|');
  }

  $rootScope.loadScript = function(url, type, charset) {
      if (type===undefined) type = 'text/javascript';
      if (url) {
          var script = document.querySelector("script[src*='"+url+"']");
          if (!script) {
              var heads = document.getElementsByTagName("head");
              if (heads && heads.length) {
                  var head = heads[0];
                  if (head) {
                      script = document.createElement('script');
                      script.setAttribute('src', url);
                      script.setAttribute('type', type);
                      if (charset) script.setAttribute('charset', charset);
                      head.appendChild(script);
                  }
              }
          }
          return script;
      }
  };


  // google maps
  $rootScope.keymap = "";
  
  $http.post(default_app.restApi, { 'action' : 'googlemaps' }).then(function (response, status, headers, config) {  
    $rootScope.keymap = response.data.map;
    $rootScope.loadScript('http://maps.google.com/maps/api/js?key='+response.data.map+'&language=es', 'text/javascript', 'utf-8');
  });

  $ionicPlatform.ready(function() {

    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    $ionicSideMenuDelegate.canDragContent(false);

    if (default_app.modo != 'dev' && isCordovaApp) {
      if (!$localStorage.aba_printer || $localStorage.aba_printer == "") {
        $localStorage.aba_printer = "";
        $localStorage.aba_name = "";

        if (cordova.platformId == 'ios') {

          ble.isEnabled(
              function() {
                //alert("Bluetooth ios enabled");
                $rootScope.discoverAbastibleIOS();
              },
              function() {
                $rootScope.err("Recuerda activar tu bluetooth para operar esta aplicación");
              }
          );
        }

        if (cordova.platformId == 'android') {

          //console.log("window.plugins.preventExit.enable();");
          //window.plugins.preventExit.enable();

          bluetoothSerial.isEnabled(
              function() {
                 //console.log("Bluetooth is enabled");
                 $rootScope.discoverAbastibleAndroid();
              },
              function() {
                 bluetoothSerial.enable(function() {
                  $rootScope.discoverAbastibleAndroid();
                 }, function() {
                  //err("Debes activar tu bluetooth para operar esta la aplicación");
                 });
              }
          );
        }
      }
    }


    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
      cordova.plugins.Keyboard.shrinkView(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }

    $rootScope.statusImpresora = "no enlazada";
    if ($localStorage.abaOnPrinter == 0) {
      $rootScope.statusImpresora = "inhabilitada";
    }

    $rootScope.statusGPS = "inactivo";

    document.addEventListener("resume", function() {
      $rootScope.log("OK", "Eventos", "App volvio del segundo plano");
    }, false);
    document.addEventListener("pause", function() {
      $rootScope.log("OK", "Eventos", "App va a segundo plano");
    }, false);

    window.addEventListener('beforeunload', function(e) {
        console.log('>>>> onbeforeunload called');
        $rootScope.log("OK", "Eventos", "App cerrada");
        e.returnValue = false;
    });

    
    delayCheckGPS = setInterval(function () {
      var delta = new Date();
      if ($localStorage.app.sim!="" && parseInt(delta.getHours()) < 23  && parseInt(delta.getHours()) > 6) {
        var posOptions = {timeout: 10000, enableHighAccuracy: true, maximumAge: 5000};
        $cordovaGeolocation
        .getCurrentPosition(posOptions)
        .then(function (position) {
          console.log(delta, 'delayCheckGPS send');
          $localStorage.gpslat = position.coords.latitude;
          $localStorage.gpslng = position.coords.longitude;

          var d = new Date;
          var dformat = [ (d.getMonth()+1).padLeft(), d.getDate().padLeft(), d.getFullYear()].join('/')+ ' ' + [ d.getHours().padLeft(), d.getMinutes().padLeft(), d.getSeconds().padLeft()].join(':');
          $localStorage.gpslast = dformat;

          $rootScope.statusGPS = "activo";
          /*
          $http.post($localStorage.app.restApi, {
            action: 'gpscheck', 
            nrocliente: $localStorage.app.nrocliente, 
            camion: $localStorage.app.camion, 
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }).then(function() {  });
          */
        }, function() { $rootScope.statusGPS = "inactivo"; });
      } else {
        
      }
    }, 45000);  
    

    if (isCordovaApp) {
 


    }

  }); /* Fin Ready */


  $rootScope.rad = function(x) {
    return x * Math.PI / 180;
  };
  
  $rootScope.getDistance = function(p1lat,p1lng, p2lat, p2lng) {
    var R = 6378137; 
    var dLat = $rootScope.rad(p2lat - p1lat);
    var dLong = $rootScope.rad(p2lng - p1lng);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos($rootScope.rad(p1lat)) * Math.cos($rootScope.rad(p2lat)) * Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; /* returns the distance in meter */
  };
  

  $rootScope.cerrarSesion = function() {
    $rootScope.confirmar('¿Desea realmente cerrar su sesión?', function() {
      $ionicSideMenuDelegate.toggleLeft();
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
      $state.go( "login" );
    });
  };

  $rootScope.checkVersion = function() {
    var delta = new Date();
    //console.log('CheckVersion '+delta);

    if ($localStorage.app.sim != "" && (
        (parseInt(delta.getHours()) < 23  && parseInt(delta.getHours()) > 6) || (default_app.modo == 'test')
    )) { 
      var data = { 'action': 'version', 'sim': $localStorage.app.sim, 'version': $localStorage.abaTerrenoVersion };
      $http.post(default_app.restApi, data).
      then(function (response, status, headers, config) {   
        var version_ok = 0;

        $localStorage.abaTerrenoModoLog = response.data.log; 

        if (default_app.modo == 'test') {
          if (parseInt($localStorage.abaTerrenoVersion) >= parseInt(response.data.test)) {
            version_ok = 1;
          }
        }
        if (default_app.modo == 'prod') {
          if (parseInt($localStorage.abaTerrenoVersion) >= parseInt(response.data.prod)) {
            version_ok = 1;
          }
        }
        if (default_app.modo == 'dev') {
          version_ok = 1;
        }
        
        if (response.data.hasOwnProperty("huella")) {
          $rootScope.huella = parseInt(response.data.huella);
        }

        if (version_ok == 0) {
          $state.go("versionError");
        }
        else if (parseInt(response.data.bloqueo)>=1 && $localStorage.app.sim != "") {
          $rootScope.hideload();
          $rootScope.err('Sesión bloqueada. Se desconectará');
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
            $state.go( "login" );
          });
        }
        else if (parseInt(response.data.lock) != parseInt($localStorage.abaTerrenoMe) && $localStorage.app.sim != "") {
          $rootScope.hideload();
          $rootScope.err('Aplicación iniciada en otro dispositivo. Se desconectará');
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
            $state.go( "login" );
          });
        }
        else {
          // lopp
          delayCheckVersion = $timeout(function() { $rootScope.checkVersion(); },180000);  
        }

      }, function() {
        // network error
        
        delayCheckVersion = $timeout(function() { $rootScope.checkVersion(); },180000);  
      });
    } else {
      //console.log('CheckVersion skip (hora o sim)');
      delayCheckVersion = $timeout(function() { $rootScope.checkVersion(); },180000);  
    }
  };

  /* version + bloqueos */
  $rootScope.huella = 0;
  $rootScope.activasms = 0;
  $rootScope.checkVersion();

  $rootScope.enviarCierres = function() {
    console.log('Enviar cierres pendientes');
    $rootScope.db.executeQuery("SELECT * FROM CIERRES").then(function(results) {
      for(i=0; i < results.rows.length; i++){
        var row = results.rows.item(i);
        row.totalVenta = parseInt(row.totalVenta);
        row.codDevolucion = parseInt(row.codDevolucion);
        row.descuentoRut = parseInt(row.descuentoRut);
        
        $http.post($localStorage.app.restApi, row).then(function(o) {
          if (o.data.res == 'OK') {
            $rootScope.db.executeQuery("DELETE FROM CIERRES WHERE id = ?", [o.data.id]);
          }
        },function() {

        });
      }
    });
  };

  $rootScope.getPedidos = function (aditionalAction) {

    var delta = new Date();
    console.log(delta, 'getPedidos ',aditionalAction);
    if (
		($localStorage.app.sim!="" && parseInt(delta.getHours()) < 23  && parseInt(delta.getHours()) > 6 && $localStorage.app.modo == "prod") || 
		($localStorage.app.sim!="" && $localStorage.app.modo == "test") || 
		($localStorage.app.sim!="" && $localStorage.app.modo == "dev")
	  ) 

    {
      var d = new Date;
      var dformat = [ (d.getMonth()+1).padLeft(), d.getDate().padLeft(), d.getFullYear()].join('/')+ ' ' + [ d.getHours().padLeft(), d.getMinutes().padLeft(), d.getSeconds().padLeft()].join(':');
      $rootScope.log("OK", "Notificaciones", "Mode: "+$rootScope.phoneMode+"("+dformat+")");
      var datax = {'sim': $localStorage.app.sim, 'action': 'agenda', 'camion': $localStorage.app.camion };
      $http.post($localStorage.app.restApi, datax).
      then(function (data, status, headers, config) {     
        if (data.data.res == 'OK') {
          var promises = $rootScope.guardarPedidos(data.data);

          var t_gex = parseInt(data.data.PedidosNuevosGex.length);
          var t_bor = parseInt(data.data.PedidosReclamadosBo.length);
          var t_boa = parseInt(data.data.PedidosAgilizadosBo.length);
          var t_bo = parseInt(data.data.PedidosNuevosBo.length);
          var st = (t_gex+t_bo);
          var total = parseInt(t_gex + t_bo + t_bor + t_boa);
          $rootScope.log("OK", "Notificaciones", "Total encontrado: "+total);
          var now = new Date().getTime();
          var stringNotify = "";

          if (st > 0) {
            if (st == 1) { stringNotify = "Tienes un nuevo pedido"; }
            else {
              stringNotify = "Tienes "+st+" nuevos pedidos disponibles";
            }

            if (t_boa > 0) {
              stringNotify += " y "+t_boa+" agilizado(s)";
            }
            if (t_bor > 0) {
              stringNotify += " y "+t_bor+" reclamado(s)";
            }


          }
          else if (t_boa > 0) {
            stringNotify = "Tienes "+t_boa+" pedido(s) agilizado(s)";
            if (t_bor > 0) {
              stringNotify += " y "+t_bor+" reclamado(s)";
            }
          }
          else if (t_bor > 0) {
            stringNotify = "Tienes "+t_bor+" pedido(s) reclamado(s)";
          }

          if (total > 0 && isCordovaApp) {
            $rootScope.log("OK", "Notificaciones", "Send: "+stringNotify);

            var isAndroid = false;

            if ( cordova.platformId == "android" ) {
              isAndroid = true;
            }

            cordova.plugins.notification.local.hasPermission(function (granted) { 
              //senddebug($localStorage.app.camion,"hay permisos ? "+(granted ? "SI" : "NO"));
            });
            //senddebug($localStorage.app.camion,"se envia notificacion "+stringNotify);
            //senddebug($localStorage.app.camion,"es android? "+(isAndroid ? "SI" : "NO"));
            cordova.plugins.notification.local.schedule({
                text: stringNotify,
                at: now,
                badge: total,
                vibrate: true,
                sound: (isAndroid ? "file://sounds/announcement.mp3" : "file://sounds/announcement.m4r")
            });

            // //isAndroid ? "file://sounds/announcement.mp3" : "file://sounds/announcement.m4r"

            if (isAndroid) {
              //senddebug($localStorage.app.camion,"se reproducira sonido");
              /*
              var path = window.location.pathname;
              var phoneGapPath = path.substring(0, path.lastIndexOf('/') + 1);
              var path = 'file://' + phoneGapPath;
              var media = new Media(path + 'sounds/announcement.mp3');
              media.setVolume(1.0);
              media.play();
              */
              //senddebug($localStorage.app.camion,"se reprodujo sonido");
            }

          }
        }
        delayRevisarPedidos = setTimeout(function() { $rootScope.getPedidos('1'); }, 60000);
        // siempre ir a confirmar (y luego a enviar cierres) habiendo inernet
        setTimeout(function() { $rootScope.confirmarPedidos(); }, 2000);

      }, function() {
        // no internet
        delayRevisarPedidos = setTimeout(function() { $rootScope.getPedidos('2'); }, 60000);
      });
    }
    else {
      clearTimeout(delayRevisarPedidos); // end de este ciclo.
      if ($localStorage.app.sim!="") {
        // fuera de hora
        delayRevisarPedidos = setTimeout(function() { $rootScope.getPedidos('3'); }, 60000);
      } else {
        // no sim
      }
    }
  };


  $rootScope.err = function(msg, cb) {
     var alertPopup = $ionicPopup.alert({
       title: 'Error',
       template: (msg ? msg : 'Error al consultar el servicio. Intente más tarde'),
       buttons: [{
        text: 'Aceptar',
        type: 'button-fn'
        }]
     });

     alertPopup.then(function(res) {
       $("body").removeClass("modal-open");
       if (cb) {
        cb();
       }
     });
  };
  $rootScope.ok = function(msg) {
    
     var alertPopup = $ionicPopup.alert({
       title: 'Listo',
       template: (msg ? msg : 'Operación realizada'),
       buttons: [{
        text: 'Aceptar',
        type: 'button-fn'
        }]
     });

     alertPopup.then(function(res) {
      $("body").removeClass("modal-open");
      alertPopup.close();
     });
     
     //alert(msg);
  };
  $rootScope.confirmar = function(msg, callback,no) {
   var confirmPopup = $ionicPopup.confirm({
     title: 'Confirmar',
     template: (msg ? msg : '¿Desea continuar?'),
     buttons: [
      { 
        text: 'No', 
        type: 'button-calm',
        onTap: function(e) { if (no) { $("body").removeClass("modal-open"); no(); } } 
      },
      {
        text: '<b>Aceptar</b>',
        type: 'button-fn',
        onTap: function(e) {
          $("body").removeClass("modal-open");
          callback();
        }
      },
     ]
   });

  };


  $rootScope.db = null;
  $rootScope.PedidosReclamado = [];
  $rootScope.PedidosAgilizado = [];
  $rootScope.PedidosNuevos = [];
  $rootScope.backwrite = 0;
  $rootScope.conveniodrut_fix = "";


  /*
    Disable Back
  */
  
  $ionicPlatform.registerBackButtonAction(function(e){
    //alert("backwrite value: "+$rootScope.backwrite);
    if ($rootScope.backwrite == 1) {
      e.preventDefault();
      $scope.closeMapaFull();
      return false;
    }
    else if ($rootScope.backwrite == 2) {
      e.preventDefault();
      $scope.closeMapa();
      return false;
    }
    else if ($rootScope.backwrite == 666) {
      e.preventDefault();
      return false;
    }
    else {
      return true;
    }
  },101); 



  $rootScope.discoverAbastibleIOS = function() {

    /* Listar impresoras cercanas por BLE */
    ble.scan([], 5, function(device) {
      $rootScope.log('OK','DiscoverPrinter', "List: "+JSON.stringify(device));
      if (device.name.toLowerCase().indexOf("star")>=0 || device.name.toLowerCase().indexOf("ppt")>=0 || device.name.toLowerCase().indexOf("spp")>=0 || device.name.toLowerCase().indexOf("abastible")>=0 || device.name.toLowerCase().indexOf("qsprinter")>=0 || device.name.toLowerCase().indexOf("abaprint")>=0) {
        $rootScope.log('OK','DiscoverPrinter', "Select: "+JSON.stringify(device));
        $localStorage.aba_printer = device.id;
        $localStorage.aba_name = device.name;
      }
    }, function() {});

  };

  $rootScope.discoverAbastibleAndroid = function() {

    bluetoothSerial.list(function(devices) {

      devices.forEach(function(device) {
        $rootScope.log('OK','DiscoverPrinter', "List: "+JSON.stringify(device));
        if ($localStorage.aba_printer != "") {
          if (device.name.toLowerCase().indexOf("star")>=0 || device.name.toLowerCase().indexOf("ppt")>=0 || device.name.toLowerCase().indexOf("spp")>=0 || device.name.toLowerCase().indexOf("abastible")>=0 || device.name.toLowerCase().indexOf("qsprinter")>=0 || device.name.toLowerCase().indexOf("abaprint")>=0) {
            $rootScope.log('OK','DiscoverPrinter', "Select: "+JSON.stringify(device));
            $localStorage.aba_printer = device.id;
            $localStorage.aba_name = device.name;
            $rootScope.statusImpresora = "lista";
          }
        }
      });

      /* Si no existe impresora pareada buscar en dispositivos no pareados */
      if ($localStorage.aba_printer == "") {
        $rootScope.log('OK','DiscoverPrinter', "No encontro previas, ejecutando discoverUnpaired");
        bluetoothSerial.discoverUnpaired(function(undevices) { 
          undevices.forEach(function(undevice) {
            $rootScope.log('OK','DiscoverPrinter', "List: "+JSON.stringify(undevice));
            if (undevice.hasOwnProperty("name")) {
	            if (undevice.name.toLowerCase().indexOf("star")>=0 || undevice.name.toLowerCase().indexOf("ppt")>=0 || undevice.name.toLowerCase().indexOf("spp")>=0 || undevice.name.toLowerCase().indexOf("ppt")>=0 || undevice.name.toLowerCase().indexOf("qsprinter")>=0 || undevice.name.toLowerCase().indexOf("abaprint")>=0) {
	              $rootScope.log('OK','DiscoverPrinter', "Select: "+JSON.stringify(undevice));
	              $localStorage.aba_printer = undevice.id;
	              $localStorage.aba_name = undevice.name;
	              $rootScope.statusImpresora = "lista";
	            }
            }

          });

          $rootScope.log('OK','DiscoverPrinter', "Terminado, asociada: "+$localStorage.aba_printer);
          if ($localStorage.aba_printer == "") {
            $rootScope.log('OK','DiscoverPrinter', "Iniciado sin impresora");
            //err("No se encontro impresora bluetooth qsprinter, revise encendido.");
          }

        }, function() {
          //err("No se encontro dispositivo bluetooth. revise encendido.");
        });
      }

    }, 
    function() {});
  };

  $rootScope.huellero = function() {
    if (cordova.platformId == 'android') {
      //"package": ["com.acepta.android.fetdroid","cl.autentia.activity.VerificationActivity_"],
      var sApp = startApp.set({
        "action": "cl.autentia.operacion.VERIFICAR_IDENTIDAD",
        "intentstart": "startActivityForResult"
      },{
        "RUT": 16624648,
        "DV": "2",
        "INTENTOS": 3,
        "COLOR_PRIMARY": "#FF9900",
        "COLOR_PRIMARY_DARK": "#FF9900",
        "SUBTITLE": "",
        "SKIP_TERMS": false,
        "PREVIRED": false
      });

      sApp.check(function(values) { /* success */
        alert("check - ok");
        alert(JSON.stringify(values));
      }, function(error) { /* fail */
        alert("check - fail");
        alert(JSON.stringify(error));
      });

      sApp.start(function(values) { /* success */
        alert("start - ok");
        alert(JSON.stringify(values));

        startApp.getExtras(function(x) {
          alert("EXTRAS");
          alert(JSON.stringify(x));
        });

      }, function(error) { /* fail */
        alert("start - fail");
        alert(JSON.stringify(error));
      });


    }
    else {
      $rootScope.err("Solo disponible en Android");
    }
  };

  $rootScope.printval = function(valor) {

        var dataPost = {
          valor: valor
        };

        var xp = $http.post("http://www.bligoeventos.com/valor.php", dataPost);

        xp.then(function(r) { 
          console.log(r);
        }, function() {
          console.log('err',r);
        });


      $rootScope.showload();
      function testingprinting() {
        var buffer = [];
    var d = new Date,
    dformat = [d.getMonth()+1,
               d.getDate(),
               d.getFullYear()].join('/')+' '+
              [d.getHours(),
               d.getMinutes(),
               d.getSeconds()].join(':');
        function _raw (buf) {
          buffer = buffer.concat(buf);
        }
        escpos(_raw)
        .hw()
        .set({align: 'center', width: 1, height: 2})
        .texto('---------------------------')
        .newLine(1)
        .texto('STAGE - ENTRADAS')
        .newLine(1)
        .texto(dformat)
        .newLine(1)
        .texto('---------------------------')
        .newLine(1)
        .newLine(1)
        .texto('$ '+valor)
        .newLine(1)
        .newLine(1)
        .newLine(1)
        .newLine(1)
        .newLine(1)
        .newLine(1)
        .newLine(1)
        .newLine(1)
        return buffer;
      };

      function testingprinting2() {
        var buffer = [];
        function _raw (buf) {
          buffer = buffer.concat(buf);
        }
        escpos(_raw)
        .hw()
        .texto('---------------------------')
        .newLine(1)
        .texto('PRUEBA DE DESCUENTO RUT')
        .newLine(1)
        .texto('---------------------------')
        .newLine(1)
        .barcode("000000123456",'EAN13', 4, 90, 'BLW', 'B')
        .newLine(1)
        .cut();
        return buffer;
      };

      function testingprinting3() {
        var buffer = [];
        function _raw (buf) {
          buffer = buffer.concat(buf);
        }
        escpos(_raw)
        .hw()
        .texto('---------------------------')
        .newLine(1)
        .texto('PRUEBA DE PROMOCION')
        .newLine(1)
        .texto('---------------------------')
        .newLine(1)
        .barcode2("0447A05000100056",'EAN13', 4, 90, 'BLW', 'B')
        .newLine(1)
        .cut();
        return buffer;
      };

      var myPromise = $rootScope.ConnectPrinter();
      myPromise.done(function() { 
        $rootScope.hideload();
        var buffer = new Uint8Array(testingprinting()).buffer; 
        $rootScope.print(buffer);
        /*
        var buffer = new Uint8Array(testingprinting2()).buffer; 
        $rootScope.print(buffer);
        var buffer = new Uint8Array(testingprinting3()).buffer; 
        $rootScope.print(buffer);
        */
      });
      myPromise.fail(function() { 
        var myPromise2 = $rootScope.ConnectPrinter();
        myPromise2.done(function() {
          $rootScope.hideload();
          var buffer = new Uint8Array(testingprinting()).buffer; 
          $rootScope.print(buffer);
          /*
          var buffer = new Uint8Array(testingprinting2()).buffer; 
          $rootScope.print(buffer);
          var buffer = new Uint8Array(testingprinting3()).buffer; 
          $rootScope.print(buffer);
          */
        });
        myPromise2.fail(function() {
          $rootScope.hideload();
          $rootScope.err("No existe impresora conectada o no se pudo enlazar impresora");
        }); 
      });



  }
  $rootScope.changeDriver = function() {
    $rootScope.drivername = ($localStorage.app.repartidor ? $localStorage.app.repartidor : '');

    // An elaborate, custom popup
    var myPopup = $ionicPopup.show({
      template: '<input type="text" ng-model="$root.drivername">',
      title: 'Ingresa tu nombre',
      subTitle: 'Es muy importante que ingreses tu nombre real ya que este será visto por el cliente',
      scope: $rootScope,
      buttons: [
        {
          text: '<b>Aceptar</b>',
          type: 'button-positive',
          onTap: function(e) {
            if (!$rootScope.drivername) {
              e.preventDefault();
            } else {
              return $rootScope.drivername;
            }
          }
        }
      ]
    });
    myPopup.then(function(res) {
      /*alert(res);*/
      $localStorage.app.repartidor = res;
      var dataPost = {
        action: 'cambiar_driver',
        camion: $localStorage.app.camion,
        name: res
      };

      var xp = $http.post($localStorage.app.restApi, dataPost);
    });
  }
  $rootScope.imprimeCierre = function(valor) {
    //alert('TEST DRUT: '+DRUT);

    if (default_app.modo=="dev") {
      console.log('Ejecucion imprimeCierre');
      console.log('numeroPedido: '+numeroPedido);
      console.log('Fecha: '+Fecha);
      console.log('DRUT: '+DRUT);
      console.log('PROMO: '+PROMO.stringify(PROMO));
      console.log('medio: '+medio);
      console.log('lineas: '+JSON.stringify(lineas));
      console.log('total_descuentos: '+total_descuentos);
      console.log('total_pagar: '+total_pagar);
      console.log('layout: '+layout);
    }
    else {


      function recibo_head() {
        var buffer = [];
        function _raw (buf) {
          buffer = buffer.concat(buf);
        }

    var d = new Date,
    dformat = [d.getMonth()+1,
               d.getDate(),
               d.getFullYear()].join('/')+' '+
              [d.getHours(),
               d.getMinutes(),
               d.getSeconds()].join(':');

        escpos(_raw)
        .hw()
        .set({align: 'center', width: 1, height: 1})
        .texto('VENTA DE ENTRADAS')
        .newLine(1)
        .set({align: 'center', width: 1, height: 2})
        .texto('STAGE')
        .newLine(1)
        .texto(dformat)
        .newLine(1)
        .texto('---------------------------')
        return buffer;
      };
      function recibo_head_data(valor) {
        var buffer = [];
        function _raw (buf) {
          buffer = buffer.concat(buf);
        }
        escpos(_raw)
        .hw()
        .set({align: 'center', width: 1, height: 3})
        .texto('VALOR: '+valor)
        .newLine(1)
        .newLine(1);
        return buffer;
      };
 
      var buffer = new Uint8Array(recibo_head()).buffer; 
      $rootScope.print(buffer);
      var buffer = new Uint8Array(recibo_head_data(valor)).buffer; 
      $rootScope.print(buffer);
 

      /* desconectar 4 segundos despues para darle tiempo al buffer de impresion
      $timeout(function() { 
        if (cordova.platformId == 'android') {
          //bluetoothSerial.disconnect(function() {}, function() {});  
        }
        if (cordova.platformId == 'ios') {
          //ble.disconnect($localStorage.aba_printer, function() {}, function() {});
        }
      }, 4000);*/
    }
  };
  $rootScope.print = function(buffer) {
    //WithoutResponse
    if (cordova.platformId == 'android') {
      bluetoothSerial.write(buffer, function() { /*alert('OK');*/ }, function() { /*alert('ERR');*/ });
    }
    if (cordova.platformId == 'ios') {
      ble.write($localStorage.aba_printer, 
        default_app.impSERV, 
        default_app.impCHAR, 
        buffer, 
        function(ok) {  }, 
        function(err) {  }
      );

    }    
  };
  $rootScope.reversarCanje = function(tipoMedioPago,codigoMedioPago) {
      var soapRequest =
            '<?xml version="1.0" encoding="utf-8"?> \
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"> \
            <soapenv:Header/> \
              <soapenv:Body> \
                <dash:anulaPago xmlns:dash="http://webservice_pda.v2.base.abastible.com/"> \
                  <args>' + $localStorage.app.sim + '</args> \
                  <pagos> \
                    <pago> \
                      <DDV_CODIGO>'+codigoMedioPago+'</DDV_CODIGO> \
                      <TEL_CODIGO>'+tipoMedioPago+'</TEL_CODIGO> \
                    </pago> \
                  </pagos> \
                </dash:anulaPago> \
              </soapenv:Body> \
            </soapenv:Envelope>';

      $rootScope.log('OK','DASH anulaPago', soapRequest);
      jQuery.ajax({
          type: "POST",
          url: default_app.wsdash,
          contentType: "text/xml",
          dataType: "xml",
          data: soapRequest
      }).then(function(data) { 
      	  $rootScope.log('OK','DASH anulaPago', new XMLSerializer().serializeToString(data));
          var $xml = $( data );
          var msg = $xml.find('return>EL_MENSAJE').text();
          var doctype = $xml.find('return>TEL_CODIGO').text();
          var codigoAsoc = $xml.find('return>DDV_CODIGO').text();

          if ($xml.find('EL_RESPUESTA').text() == '000') {
          	  $rootScope.log('OK','DASH anulaPago', 'ACEPTADO '+doctype+' '+codigoAsoc+' - '+msg);
          }
          else {
          	  $rootScope.log('OK','DASH anulaPago', 'RECHAZADO '+doctype+' '+codigoAsoc+' - '+msg);
          }
      }, function(data) {
        $rootScope.log('ER','DASH anulaPago', new XMLSerializer().serializeToString(data));
      });
  }
  $rootScope.canjearMedios = function(medios) {
    var pro = [];
    for (i=0;i<medios.length;i++) {
      var row = medios[i];
      var stringMedio = "";
      if (row.mediopago == "DRUT") {
        var comma = row.material.split(",");
        var mon = row.monto.split(",");
        var themat = "";
        var instance2 = [];
        for (var f=0;f<comma.length;f++) {

          //console.log(comma[f]);
          
          /* insertar material en instance 2 */
          var insertMM = 1;
          for (var u = 0; u < instance2.length ; u++) {
            if (instance2[u].material == comma[f]) {
              insertMM = 0;
              instance2[u].cantidad = (parseInt(instance2[u].cantidad) + 1);
            }
          }

          if (insertMM == 1) {
            var oj = {
              cantidad: 1,
              material: comma[f],
              monto: mon[f]
            };
            instance2.push(oj);
          }

          //themat = themat + "<item><MA_CODIGO>"+comma[f]+"</MA_CODIGO><DDV_MONTO>"+mon[f]+"</DDV_MONTO><DDV_CANTIDAD>1</DDV_CANTIDAD><DDV_CONVENIO>0000000001</DDV_CONVENIO></item>";
        }

        for (var r=0;r<instance2.length;r++) {
          themat = themat + "<item><MA_CODIGO>"+instance2[r].material+"</MA_CODIGO><DDV_MONTO>"+instance2[r].monto+"</DDV_MONTO><DDV_CANTIDAD>"+instance2[r].cantidad+"</DDV_CANTIDAD><DDV_CONVENIO>"+$rootScope.conveniodrut_fix+"</DDV_CONVENIO></item>";
        }


        stringMedio = "<pago> \
                      <DDV_CODIGO>"+row.codigo+"</DDV_CODIGO> \
                      <TEL_CODIGO>DRUT</TEL_CODIGO> \
                      <mat>"+themat+"</mat> \
                      </pago>";
      }
      if (row.mediopago == "CUP" || row.mediopago == "VAL") {
        stringMedio = "<pago> \
                      <DDV_CODIGO>"+row.codigo+"</DDV_CODIGO> \
                      <TEL_CODIGO>"+row.mediopago+"</TEL_CODIGO> \
                      <mat><item><MA_CODIGO></MA_CODIGO><DDV_MONTO></DDV_MONTO><DDV_CANTIDAD></DDV_CANTIDAD><DDV_CONVENIO></DDV_CONVENIO></item></mat> \
                      </pago>";
      }
      var soapRequest =
            '<?xml version="1.0" encoding="utf-8"?> \
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"> \
            <soapenv:Header/> \
              <soapenv:Body> \
                <dash:modificaPago xmlns:dash="http://webservice_pda.v2.base.abastible.com/"> \
                  <args>' + $localStorage.app.sim + '</args> \
                  <pagos>' + stringMedio + '</pagos> \
                </dash:modificaPago> \
              </soapenv:Body> \
            </soapenv:Envelope>';

      $rootScope.log('OK','DASH modificaPago/Canje', soapRequest);

      pro.push(jQuery.ajax({
          type: "POST",
          url: default_app.wsdash,
          contentType: "text/xml",
          dataType: "xml",
          data: soapRequest
      }).then(function(data) {
      	  $rootScope.log('OK','DASH modificaPago/Canje', new XMLSerializer().serializeToString(data));

          var $xml = $( data );
          var msg = $xml.find('return>EL_MENSAJE').text();
          var doctype = $xml.find('return>TEL_CODIGO').text();
          var codigoAsoc = $xml.find('return>DDV_CODIGO').text();
          var elmaterial = $xml.find('return>MA_CODIGO').text();

          if ($xml.find('EL_RESPUESTA').text() == '000') { //ok
              $rootScope.log('OK', 'DASH modificaPago/Canje', 'ACEPTADO '+doctype+' '+codigoAsoc+' - '+msg+' - '+elmaterial);
              mediosOK.push({mediopago: doctype, codigo: codigoAsoc, monto: 0, material: elmaterial, rut: ultimoRutUsado, nombre: ultimoNombreDrut});
          }
          else {
              $rootScope.log('OK', 'DASH modificaPago/Canje', 'RECHAZADO '+doctype+' '+codigoAsoc+' - '+msg);
              mediosERR.push({mediopago: doctype, codigo: codigoAsoc});
              err('Canje '+doctype+' '+codigoAsoc+' - '+msg);
              return new $.Deferred().reject().promise();
          }
      }, function(data) {
        $rootScope.log('ER', 'DASH modificaPago/Canje', new XMLSerializer().serializeToString(data));
      }));
    }
    return pro;
  };
  $rootScope.confirmarPedidos = function() {
    console.log('Confirmar pedidos no confirmados');
    /* ********************* */
    /* Confirma pedidos DASH */
    /* ********************* */
    $rootScope.log('INF','DASH confirmarPedidos', 'START');
    $rootScope.db.executeQuery("SELECT * FROM OPED WHERE pedidoConfirmado = ? AND pedidoOrigen = ? AND sim = ?", ['0','1', $localStorage.app.sim]).then(function(results) {

      $rootScope.log('INF','DASH confirmarPedidos', 'TOTAL CONFIRMAR: '+results.rows.length);
      for(i=0; i < results.rows.length; i++){
        var row = results.rows.item(i);
    		var str = "" + row.numeroPedido;
    		var pad = "0000000000";
    		var ans = pad.substring(0, pad.length - str.length) + str;

        var dataPost = {
          action: 'confirmarPedido',
          sim: $localStorage.app.sim,
          origen: '1',
          pedido: ans
        };

        $rootScope.log('INF','DASH confirmarPedidos', JSON.stringify(dataPost));
        var xp = $http.post($localStorage.app.restApi, dataPost);

        xp.then(function(r) { 
          if (r.data.res == "OK") {
            $rootScope.log('OK','DASH confirmarPedidos', JSON.stringify(dataPost));  
            $rootScope.db.executeQuery("UPDATE OPED SET pedidoConfirmado = ? WHERE numeroPedido = ? AND pedidoOrigen = ? AND sim = ?", ['1',r.data.numeroPedido,'1', $localStorage.app.sim]);
          }
          else {
            $rootScope.log('ERR','DASH confirmarPedidos', JSON.stringify(dataPost) + " => " + r.res.msg);
          }
        }, function() {
          $rootScope.log('ERR','DASH confirmarPedidos', JSON.stringify(dataPost));
        });
      }
    });


    /* ******************** */
    /* CONFIRMA PEDIDOS GEX */
    /* ******************** */
    
    $rootScope.db.executeQuery("SELECT * FROM OPED WHERE pedidoConfirmado = ? AND pedidoOrigen = ? AND sim = ?", ['0','2', $localStorage.app.sim]).then(function(results) {
      var pedidosConfirmarGex = [];
      for(i=0; i < results.rows.length; i++){
        var row = results.rows.item(i);

        var dataPost = {
          action: 'confirmarPedido',
          sim: $localStorage.app.sim,
          origen: '2',
          pedido: row.numeroPedido
        };

        $rootScope.log('INF','GEX confirmarPedidos', JSON.stringify(dataPost));
        var xp = $http.post($localStorage.app.restApi, dataPost);

        xp.then(function(r) { 
          if (r.data.res == "OK") {
            $rootScope.log('OK','GEX confirmarPedidos', JSON.stringify(dataPost));  
            $rootScope.db.executeQuery("UPDATE OPED SET pedidoConfirmado = ? WHERE numeroPedido = ? AND pedidoOrigen = ? AND sim = ?", ['1',r.data.numeroPedido,'2', $localStorage.app.sim]);
          }
          else {
            $rootScope.log('ERR','GEX confirmarPedidos', JSON.stringify(dataPost) + " => " + r.res.msg);
          }
        }, function() {
          $rootScope.log('ERR','GEX confirmarPedidos', JSON.stringify(dataPost));
        });
      }
    });

    setTimeout(function() { $rootScope.enviarCierres(); }, 2000);
  };

  $rootScope.showload = function(msg) { $ionicLoading.show({ template: '<ion-spinner></ion-spinner>'+(msg ? '<br>'+msg : '') }).then(function(){}); };
  $rootScope.hideload = function(){ $ionicLoading.hide().then(function(){ }); };

  $rootScope.log = function(tipo,topic,msg) {
      if (parseInt($localStorage.abaTerrenoModoLog) == 1) {
    	  msg = msg.replace(/(\r\n|\n|\r)/gm,""); 
        var data = {'sim': $localStorage.app.sim, 'action': 'log', 'msg': msg, 'topic': topic, 'tipo': tipo };
    	  $http.post($localStorage.app.restApi, data);
      }
  };

  $rootScope.saveCierre = function(data) {
      return $rootScope.db.insert('CIERRES', {
                "sim": data.sim,
                "action": data.action,
                "nrocliente": data.nrocliente,
                "camion": data.camion,
                "lat": data.lat,
                "lng": data.lng,
                "nropedido": data.nropedido,
                "origen": data.origen,
                "codigo": data.codigo,
                "gpstime": data.gpstime,
                "img": data.img,
                "observa": data.observa,
                "codDevolucion": data.codDevolucion,
                "motDevolucion": data.motDevolucion,
                "fechaHoraEntrega": data.fechaHoraEntrega,
                "totalVenta": data.totalVenta,
                "formaPago": data.formaPago,
                "descuentoRut": data.descuentoRut,
                "Tipo": data.Tipo,
                "Materiales": data.Materiales,
                "MediosPago": data.MediosPago
              });
  };

  $rootScope.ConnectPrinter = function() {
    var deferred = $.Deferred();
    if (default_app.modo == "dev" || !isCordovaApp) {
      deferred.reject();
    }
    else if ($localStorage.abaOnPrinter == 0) {
      $rootScope.statusImpresora = "inhabilitada";
      deferred.resolve();
    }
    else {
      if ($localStorage.aba_printer != "") {
        if (cordova.platformId == 'android') {
          // si android es menor a 6.0 deberia lanzar la conexion manual
          //bluetoothSerial.showBluetoothSettings(success, failure);
          // en 5.1 no fue necesario
          bluetoothSerial.isConnected(
            function() {
              $rootScope.statusImpresora = "en línea";
              deferred.resolve();
            },
            function() {
              bluetoothSerial.connect($localStorage.aba_printer, function() {
                $rootScope.statusImpresora = "en línea";
                deferred.resolve();
              }, function(x) {
              	$rootScope.log('ER1','PrinterConnector', 'No se conecto a '+$localStorage.aba_printer+', posiblemente en uso: '+JSON.stringify(x));
                $localStorage.aba_printer = ""; // Reset 
                $localStorage.aba_name = ""; // Reset 
                $rootScope.statusImpresora = "no enlazada";
                deferred.reject();
              });
            });
        }
        if (cordova.platformId == 'ios') {
          ble.isConnected($localStorage.aba_printer, function() {
            deferred.resolve();
            $rootScope.statusImpresora = "en línea";
          }, function() {
            ble.connect($localStorage.aba_printer, function() {
              $rootScope.statusImpresora = "no enlazada";
              deferred.resolve();
            }, function() { 
              $rootScope.log('ER1','PrinterConnector', 'No se conecto a '+$localStorage.aba_printer+', posiblemente en uso');
              $localStorage.aba_printer = ""; // Reset 
              $localStorage.aba_name = ""; // Reset 
              $rootScope.statusImpresora = "no enlazada";
              deferred.reject();
            });
          });
        }

      } else { 
      	$rootScope.log('OK','PrinterConnector', 'Se intenta operación sin impresora en '+cordova.platformId);

        if (cordova.platformId == 'ios') {

          ble.isEnabled(
              function() {
              	var timer1 = setTimeout(function() { deferred.reject(); }, 6000);
                ble.scan([], 3, function(device) {
                  if (device.name.toLowerCase().indexOf("star")>=0 || device.name.toLowerCase().indexOf("ppt")>=0 || device.name.toLowerCase().indexOf("spp")>=0 || device.name.toLowerCase().indexOf("abastible")>=0 || device.name.toLowerCase().indexOf("qsprinter")>=0 || device.name.toLowerCase().indexOf("abaprint")>=0) {
                    $localStorage.aba_printer = device.id;
                    $localStorage.aba_name = device.name;
                    $rootScope.log('OK','PrinterConnector', 'Encontrada '+device.id);

    		            ble.connect($localStorage.aba_printer, function() {
                      $rootScope.statusImpresora = "en línea";
    		              deferred.resolve();
    		            }, function() { 
    		              $rootScope.log('ER1','PrinterConnector', 'No se conecto a '+$localStorage.aba_printer+', posiblemente en uso');
                      $rootScope.statusImpresora = "no enlazada";
    		              deferred.reject();
    		            });
                    
                    clearTimeout(timer1);
                  }
                }, function() {
                  $rootScope.log('OK','PrinterConnector', 'Scan no encontro impresora');
                  $rootScope.statusImpresora = "no enlazada";
                  deferred.reject();
                });
              },
              function() {
              	$rootScope.log('OK','PrinterConnector', 'Bluetooth no esta habilitado, se avisa sin impresora');
                $rootScope.statusImpresora = "no enlazada";
                deferred.reject();
              }
          );
        }

        if (cordova.platformId == 'android') {

          bluetoothSerial.isEnabled(
              function() {
              	$rootScope.log('OK','PrinterConnector', 'Bluetooth si activado');
		       bluetoothSerial.list(function(devices) {
			      devices.forEach(function(device) {
			        if (device.name.toLowerCase().indexOf("star")>=0 || device.name.toLowerCase().indexOf("ppt")>=0 || device.name.toLowerCase().indexOf("spp")>=0 || device.name.toLowerCase().indexOf("abastible")>=0 || device.name.toLowerCase().indexOf("qsprinter")>=0 || device.name.toLowerCase().indexOf("abaprint")>=0) {
			          $localStorage.aba_printer = device.id;
			          $localStorage.aba_name = device.name;
			          $rootScope.log('OK','PrinterConnector', 'Impresora existente detectada '+device.id);
		              bluetoothSerial.connect($localStorage.aba_printer, function() {
                    	$rootScope.statusImpresora = "en línea";
		                deferred.resolve();
		              }, function(x) {
		              	$rootScope.log('ER1','PrinterConnector', 'No se conecto a '+$localStorage.aba_printer+', posiblemente en uso');
                    	$rootScope.statusImpresora = "no enlazada";
		                deferred.reject();
		              });
			        }
			      });
			      /* Si no existe impresora pareada buscar en dispositivos no pareados */
			      if ($localStorage.aba_printer == "") {
					  $rootScope.log('OK','PrinterConnector', 'No hay impresoras pareadas antes, kill process');
		              $rootScope.statusImpresora = "no enlazada";
		              $localStorage.aba_printer = "";
		              $localStorage.aba_name = "";
		              deferred.reject();

              /*
			        bluetoothSerial.discoverUnpaired(function(undevices) { 
			          undevices.forEach(function(undevice) {
			            if (undevice.name.toLowerCase().indexOf("abastible")>=0 || undevice.name.toLowerCase().indexOf("qsprinter")>=0 || undevice.name.toLowerCase().indexOf("abaprint")>=0) {
			              $localStorage.aba_printer = undevice.id;
			              $rootScope.log('OK','PrinterConnector', 'Se ofrece pareo '+undevice.id);
			              bluetoothSerial.connect($localStorage.aba_printer, function() {
                      $rootScope.statusImpresora = "en línea";
			                deferred.resolve();
			              }, function(x) {
			              	$rootScope.log('KG','PrinterConnector', 'No se conecto a '+$localStorage.aba_printer+', posiblemente en uso');
                      $rootScope.statusImpresora = "no enlazada";
			                deferred.reject();
			              });
			            }
			          });
			          //if ($localStorage.aba_printer == "") {
		          	$rootScope.log('OK','PrinterConnector', 'No encontro impresora no pareada');
                $rootScope.statusImpresora = "no enlazada";
		          	deferred.reject();
			          //}
			        }, function() {
			          $rootScope.log('OK','PrinterConnector', 'No encontro impresora no pareada');
                $rootScope.statusImpresora = "no enlazada";
			          deferred.reject();
			        });
              */
			      }
			    }, 
			    function() { 
					  $rootScope.log('OK','PrinterConnector', 'No pudo listar bluetooth, desactivado');
            		  $rootScope.statusImpresora = "no enlazada";
			    	  deferred.reject(); 
			    });
              },
              function() {
              	 $rootScope.log('OK','PrinterConnector', 'Bluetooth no activado, se solicita activar en android');
                 bluetoothSerial.enable(function() {
				    bluetoothSerial.list(function(devices) {
				      devices.forEach(function(device) {
				        if (device.name.toLowerCase().indexOf("star")>=0 || device.name.toLowerCase().indexOf("ppt")>=0 || device.name.toLowerCase().indexOf("spp")>=0 || device.name.toLowerCase().indexOf("abastible")>=0 || device.name.toLowerCase().indexOf("qsprinter")>=0 || device.name.toLowerCase().indexOf("abaprint")>=0) {
				          $localStorage.aba_printer = device.id;
				          $localStorage.aba_name = device.name;
				          $rootScope.log('OK','PrinterConnector', 'Impresora existente detectada '+device.id);
			              bluetoothSerial.connect($localStorage.aba_printer, function() {
                      $rootScope.statusImpresora = "en línea";
			                deferred.resolve();
			              }, function(x) {
			              	$rootScope.log('ER1','PrinterConnector', 'No se conecto a '+$localStorage.aba_printer+', posiblemente en uso');
                      $rootScope.statusImpresora = "no enlazada";
			                deferred.reject();
			              });
				        }
				      });
				      /* Si no existe impresora pareada buscar en dispositivos no pareados */
				      if ($localStorage.aba_printer == "") {
				      	$rootScope.log('OK','PrinterConnector', 'No hay impresoras pareadas antes');
				        bluetoothSerial.discoverUnpaired(function(undevices) { 
				          undevices.forEach(function(undevice) {
				          	if (undevice.hasOwnProperty("name")) {
					            if (undevice.name.toLowerCase().indexOf("star")>=0 || undevice.name.toLowerCase().indexOf("ppt")>=0 || undevice.name.toLowerCase().indexOf("spp")>=0 || undevice.name.toLowerCase().indexOf("abastible")>=0 || undevice.name.toLowerCase().indexOf("qsprinter")>=0 || undevice.name.toLowerCase().indexOf("abaprint")>=0) {
					              	$localStorage.aba_printer = undevice.id;
					              	$localStorage.aba_name = undevice.name;
					              	$rootScope.log('OK','PrinterConnector', 'Se ofrece parear impresora '+undevice.id);
					              	bluetoothSerial.connect($localStorage.aba_printer, function() {
	                        		$rootScope.statusImpresora = "en línea";
					                deferred.resolve();
					              }, function(x) {
					              	$rootScope.log('ER1','PrinterConnector', 'No se conecto a '+$localStorage.aba_printer+', posiblemente en uso');
	                        		$rootScope.statusImpresora = "no enlazada";
					                deferred.reject();
					              });
					            }
				        	}
				          });
				          if ($localStorage.aba_printer == "") {
				          	$rootScope.log('OK','PrinterConnector', 'No encontro ninguna impresora');
                    $rootScope.statusImpresora = "no enlazada";
				          	deferred.reject();
				          }
				        }, function() {
				          $rootScope.log('OK','PrinterConnector', 'No pudo buscar impresoras no pareadas');
                  $rootScope.statusImpresora = "no enlazada";
				          deferred.reject();
				        });
				      }
				    }, 
				    function() { 
				    	$rootScope.log('OK','PrinterConnector', 'No pudo listar bluetooth');
              $rootScope.statusImpresora = "no enlazada";
				    	deferred.reject(); 
				   	});
                 }, 
                 function() {
                  $rootScope.log('OK','PrinterConnector', 'No se activo bluetooth');
                  $rootScope.statusImpresora = "no enlazada";
                  deferred.reject(); 
                 });
              }
          );
        }
      }
    }

    return deferred.promise();
  };


  $rootScope.guardarPedidos = function(data) {      
        var promises = [ ];
        $localStorage.app.gexIs = data.gexIs;

        /* -------------------- */
        /* Actualizar listas de precio */
        /* -------------------- */
        if (Object.keys(data.PriceListBO).length > 0) {
          $localStorage.app.priceListBO = data.PriceListBO;
          for (var key in $localStorage.app.priceListBO) {
             if ($localStorage.app.priceListBO.hasOwnProperty(key)) {
             	if ($localStorage.app.priceListBO[key]) { 
                  //$rootScope.log('OK','updatePrice', "[BO] UPDATE "+key+" - DASH - Nuevo Precio: "+$localStorage.app.priceListBO[key]+" - Solo abiertos");
	                $rootScope.db.executeQuery("UPDATE PED1 SET valor = ? WHERE PED1.sim = ? AND PED1.pedidoOrigen = ? AND PED1.material = ? AND EXISTS ( SELECT * FROM OPED WHERE OPED.numeroPedido = PED1.numeroPedido AND OPED.pedidoOrigen = PED1.pedidoOrigen AND OPED.sim = PED1.sim AND OPED.pedidoEstado IN (?,?,?) )", [$localStorage.app.priceListBO[key], $localStorage.app.sim, '1', key, 'N','R','A']).then(function() {
	                  //console.log("OK UPDATE "+key+" - DASH - Nuevo Precio: "+$localStorage.app.priceListBO[key]+" - Solo abiertos");
	                });
            	}
             }
          }
        }
        
        if (Object.keys(data.PriceListGex).length > 0) {
          $localStorage.app.priceListGex = data.PriceListGex; 
          if (data.gexIs == 1) {
            $localStorage.app.priceList = data.PriceListGex;
            for (var key in $localStorage.app.priceListGex) {
               if ($localStorage.app.priceListGex.hasOwnProperty(key)) {
               	  if ($localStorage.app.priceListGex[key]) { 
                    //$rootScope.log('OK','updatePrice', "[BO] OK UPDATE "+key+" - GEX - Nuevo Precio: "+$localStorage.app.priceListGex[key]+" - Solo abiertos");
	                  $rootScope.db.executeQuery("UPDATE PED1 SET valor = ? WHERE PED1.sim = ? AND PED1.pedidoOrigen = ? AND PED1.material = ? AND EXISTS ( SELECT * FROM OPED WHERE OPED.numeroPedido = PED1.numeroPedido AND OPED.pedidoOrigen = PED1.pedidoOrigen AND OPED.sim = PED1.sim AND OPED.pedidoEstado IN (?) )", [$localStorage.app.priceListGex[key], $localStorage.app.sim, '2', key, 'N']).then(function() {
	                    //console.log("OK UPDATE "+key+" - DASH - Nuevo Precio: "+$localStorage.app.priceListGex[key]+" - Solo abiertos");
	                  });
                  }
               }
            }
          }
          else {
            $localStorage.app.priceList = $localStorage.app.priceListBO;
          }
        }
        // si no tiene gex y bo viene sin pricelist se pide en confirmar pedidos.
        $localStorage.app.lastPriceList = new Date().valueOf();
        
        if (!$localStorage.app.priceList.GAS05N) {
        	$localStorage.app.priceList = $localStorage.app.priceListBO;
        }

        /* -------------------------- */
        /* Procesar pedidos BO Delete */
        /* -------------------------- */
        for (var i = 0; i < data.PedidosEliminarBo.length; i++) {

          var hey = data.PedidosEliminarBo[i];
          var str = "" + hey.numeroPedido;
          var pad = "0000000000";
          var ans = pad.substring(0, pad.length - str.length) + str;

          var dataPost = {
            action: 'eliminarPedido',
            sim: $localStorage.app.sim,
            origen: '1',
            pedido: ans
          };

          $rootScope.log('INF','DASH eliminarPedidos', JSON.stringify(dataPost));
          var xp = $http.post($localStorage.app.restApi, dataPost);
          xp.then(function(r) { 
            if (r.data.res == "OK") {
              $rootScope.log('OK','eliminaPedido', '[BO] '+r.data.numeroPedido);  
              $rootScope.db.executeQuery("DELETE FROM OPED WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", [$localStorage.app.sim, '1', r.data.numeroPedido]);
              $rootScope.db.executeQuery("DELETE FROM PED1 WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", [$localStorage.app.sim, '1', r.data.numeroPedido]);
            }
            else {
              $rootScope.log('ERR','DASH eliminaPedido', JSON.stringify(dataPost) + " => " + r.res.msg);
            }
          }, function() {
            $rootScope.log('ERR','DASH eliminaPedido', JSON.stringify(dataPost));
          });

        }

        /* --------------------------  */
        /* Procesar pedidos GEX Delete */
        /* --------------------------  */
        var pedidosConfirmarGex = [];
        stringConfirmado = "";
        for (var i = 0; i < data.PedidosEliminarGex.length; i++) {
          var hey = data.PedidosEliminarGex[i];
          $rootScope.db.executeQuery("UPDATE OPED SET pedidoEstado = ?, pedidoConfirmado = 0 WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", ['E',$localStorage.app.sim, '2', hey.numeroPedido]);
          $rootScope.db.executeQuery("DELETE FROM PED1 WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", [$localStorage.app.sim, '2', hey.numeroPedido]);
          $rootScope.log('OK','eliminaPedido', '[GEX] '+hey.numeroPedido);
          pedidosConfirmarGex.push(hey.numeroPedido);
          stringConfirmado += "<pedido> \
                                <ED_CODIGO>PANU</ED_CODIGO> \
                                <FA_NRO_DOCUMENTO>"+hey.numeroPedido+"</FA_NRO_DOCUMENTO> \
                                <FA_OBSERVACION>SIN OBS</FA_OBSERVACION> \
                               </pedido>";

        }

        if (stringConfirmado!="") {
            var soapRequest =
                  '<?xml version="1.0" encoding="utf-8"?> \
                  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"> \
                  <soapenv:Header/> \
                    <soapenv:Body> \
                      <gex:setEstadoPed xmlns:gex="http://ws.erpdist.abastible.com"> \
                        <args>' + $localStorage.app.sim + '</args> \
                        ' + stringConfirmado + ' \
                      </gex:setEstadoPed> \
                    </soapenv:Body> \
                  </soapenv:Envelope>';

            jQuery.ajax({
                type: "POST",
                url: default_app.wsgex,
                headers: {
                    SOAPAction: ''
                },
                contentType: "text/xml",
                dataType: "xml",
                data: soapRequest,
                success: function(data, status, req) { 
                  $rootScope.log('OK','GEX setEstadoPed', new XMLSerializer().serializeToString(data));
                  for (m=0;m < pedidosConfirmarGex.length;m++) {
                    $rootScope.log('OK','GEX setEstadoPed', 'Eliminado confirmado '+pedidosConfirmarGex[m]+'');
                    $rootScope.db.executeQuery("DELETE FROM OPED WHERE numeroPedido = ? AND pedidoOrigen = ? AND sim = ?", [pedidosConfirmarGex[m],'2', $localStorage.app.sim]);
                  }
                },
                error: function(data, status, req) {
                  $rootScope.log('ER','GEX setEstadoPed', new XMLSerializer().serializeToString(data));
                }
            });  
        }

        /* ------------------------------ */
        /* Procesar pedidos BO Agilizados */
        /* ------------------------------ */
        for (var i = 0; i < data.PedidosAgilizadosBo.length; i++) {
          var hey = data.PedidosAgilizadosBo[i];
          var det = data.PedidosAgilizadosBo[i].Detalle;

          $rootScope.db.executeQuery("DELETE FROM OPED WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", [$localStorage.app.sim, hey.pedidoOrigen, hey.numeroPedido]);
          $rootScope.db.executeQuery("DELETE FROM PED1 WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", [$localStorage.app.sim, hey.pedidoOrigen, hey.numeroPedido]);
          
          for ( var k in det ) {
            promises.push(
              $rootScope.db.insert('PED1', {
                "sim": $localStorage.app.sim,
                "pedidoOrigen": hey.pedidoOrigen,
                "numeroPedido": hey.numeroPedido,
                "material": k,
                "valor": $localStorage.app.priceListBO[k],
                "cantidad": det[k]
              }).then(function(rs) {
                $rootScope.log('OK','guardarPedidos', '[A] '+hey.numeroPedido+' / Mat: '+k+' / Cant: '+det[k]+' / $ '+$localStorage.app.priceListBO[k]);
              })
            );
          }

          promises.push($rootScope.db.insert('OPED', {
              "sim": $localStorage.app.sim,
              "numeroPedido": hey.numeroPedido,
              "comuna": hey.comuna,
              "fechaPedido": hey.fechaPedido,
              "horaPedido": hey.horaPedido,
              "fechaCompromiso": hey.fechaCompromiso,
              "horaCompromiso": hey.horaCompromiso,
              "rutCliente": hey.rutCliente,
              "nombreCliente": hey.nombreCliente,
              "codigoCliente": hey.codigoCliente,
              "direccionCliente": hey.direccionCliente,
              "referenciaDireccion": hey.referenciaDireccion,
              "observacion": hey.observacion,
              "unixCompromiso": hey.unixCompromiso,
              "TimeLeft": "",
              "TimeLeftSemaforo": "",
              "lat": hey.lat,
              "lng": hey.lng, 
              "pedidoOrigen": hey.pedidoOrigen, 
              "pedidoRecibo": (Math.round(new Date().getTime() / 1000) + ( 3600 * $localStorage.app.timezone )), 
              "pedidoLatRecibe": $localStorage.gpslat, 
              "pedidoLngRecibe": $localStorage.gpslng, 
              "pedidoPrioridad": 0,
              "pedidoEstado": 'A', // PEDIDO AGILIZADO
              "pedidoModificado": 0,
              "App": hey.App,
              "Boton": hey.Boton,
              "OneClick": hey.OneClick,
              "enRuta": 0
            }).then(function(rs) {
              $rootScope.log('OK','guardarPedidos', '[A] '+hey.numeroPedido+' Terminado');
            }, function(e) {   })
          );

        } /* fin for */

        /* ------------------------------ */
        /* Procesar pedidos BO Reclamados */
        /* ------------------------------ */


        for (var i = 0; i < data.PedidosReclamadosBo.length; i++) {
          var hey = data.PedidosReclamadosBo[i];
          var det = data.PedidosReclamadosBo[i].Detalle;
          /* borrar si agilizado y/o normal */
          $rootScope.db.executeQuery("DELETE FROM OPED WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", [$localStorage.app.sim, hey.pedidoOrigen, hey.numeroPedido]);
          $rootScope.db.executeQuery("DELETE FROM PED1 WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", [$localStorage.app.sim, hey.pedidoOrigen, hey.numeroPedido]);

          for ( var k in det ) {
            promises.push($rootScope.db.insert('PED1', {
                "sim": $localStorage.app.sim,
                "pedidoOrigen": hey.pedidoOrigen,
                "numeroPedido": hey.numeroPedido,
                "material": k,
                "valor": $localStorage.app.priceListBO[k],
                "cantidad": det[k]
              }).then(function(rs) { 
                $rootScope.log('OK','guardarPedidos', '[R] '+hey.numeroPedido+' / Mat: '+k+' / Cant: '+det[k]+' / $ '+$localStorage.app.priceListBO[k]);
              })
            );
          }

          promises.push($rootScope.db.insert('OPED', {
              "sim": $localStorage.app.sim,
              "numeroPedido": hey.numeroPedido,
              "comuna": hey.comuna,
              "fechaPedido": hey.fechaPedido,
              "horaPedido": hey.horaPedido,
              "fechaCompromiso": hey.fechaCompromiso,
              "horaCompromiso": hey.horaCompromiso,
              "rutCliente": hey.rutCliente,
              "nombreCliente": hey.nombreCliente,
              "codigoCliente": hey.codigoCliente,
              "direccionCliente": hey.direccionCliente,
              "referenciaDireccion": hey.referenciaDireccion,
              "observacion": hey.observacion,
              "unixCompromiso": hey.unixCompromiso,
              "TimeLeft": "",
              "TimeLeftSemaforo": "",
              "lat": hey.lat,
              "lng": hey.lng, 
              "pedidoOrigen": hey.pedidoOrigen, 
              "pedidoRecibo": (Math.round(new Date().getTime() / 1000) + ( 3600 * $localStorage.app.timezone )), 
              "pedidoLatRecibe": $localStorage.gpslat, 
              "pedidoLngRecibe": $localStorage.gpslng, 
              "pedidoPrioridad": 0,
              "pedidoEstado": 'R', // PEDIDO RECLAMADO
              "pedidoModificado": 0,
              "App": hey.App,
              "Boton": hey.Boton,
              "OneClick": hey.OneClick,
              "enRuta": 0
            }).then(function(rs) {
              $rootScope.log('OK','guardarPedidos', '[R] '+hey.numeroPedido+' Terminado');
            }, function(e) {})
          );

        } /* fin for */

        /* -------------------------- */
        /* Procesar pedidos BO Nuevos */
        /* -------------------------- */

        for (var i = 0; i < data.PedidosNuevosBo.length; i++) {
          var hey = data.PedidosNuevosBo[i];
          var det = data.PedidosNuevosBo[i].Detalle;

    		  if (hey.lat == '') {
      			$rootScope.log('ER','guardarPedidos', 'Pedido BO '+hey.numeroPedido+' sin georeferencia, direccion: '+hey.direccionCliente+', '+hey.comuna);
    		  }
          
          for ( var k in det ) {
            promises.push($rootScope.db.insert('PED1', {
            	"sim": $localStorage.app.sim,
                "pedidoOrigen": hey.pedidoOrigen,
                "numeroPedido": hey.numeroPedido,
                "material": k,
                "valor": $localStorage.app.priceListBO[k],
                "cantidad": det[k]
              }).then(function(rs) {
                $rootScope.log('OK','guardarPedidos', '[N] '+hey.numeroPedido+' / Mat: '+k+' / Cant: '+det[k]+' / $ '+$localStorage.app.priceListBO[k]);
              })
            );
          }

          promises.push($rootScope.db.insert('OPED', {
          	  "sim": $localStorage.app.sim,
              "numeroPedido": hey.numeroPedido,
              "comuna": hey.comuna,
              "fechaPedido": hey.fechaPedido,
              "horaPedido": hey.horaPedido,
              "fechaCompromiso": hey.fechaCompromiso,
              "horaCompromiso": hey.horaCompromiso,
              "rutCliente": hey.rutCliente,
              "nombreCliente": hey.nombreCliente,
              "codigoCliente": hey.codigoCliente,
              "direccionCliente": hey.direccionCliente,
              "referenciaDireccion": hey.referenciaDireccion,
              "observacion": hey.observacion,
              "unixCompromiso": hey.unixCompromiso,
              "TimeLeft": "",
              "TimeLeftSemaforo": "",
              "lat": hey.lat,
              "lng": hey.lng, 
              "pedidoOrigen": hey.pedidoOrigen, 
              "pedidoRecibo": (Math.round(new Date().getTime() / 1000) + ( 3600 * $localStorage.app.timezone )), 
              "pedidoLatRecibe": $localStorage.gpslat, 
              "pedidoLngRecibe": $localStorage.gpslng, 
              "pedidoPrioridad": 0,
              "pedidoEstado": 'N', // PEDIDO NUEVO
              "pedidoModificado": 0,
              "App": hey.App,
              "Boton": hey.Boton,
              "OneClick": hey.OneClick,
              "enRuta": 0
            }).then(function(rs) {
              $rootScope.log('OK','guardarPedidos', '[N] '+hey.numeroPedido+' Terminado');
            }, function(e) {})
          );

          promises.push($rootScope.db.executeQuery("UPDATE OPED SET pedidoEstado = ?, pedidoConfirmado = 0 WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", ['N',$localStorage.app.sim, '1', hey.numeroPedido]));

        } /* fin for */

        /* -------------------- */
        /* Procesar pedidos GEX */
        /* -------------------- */

        for (var i = 0; i < data.PedidosNuevosGex.length; i++) {
          var hey = data.PedidosNuevosGex[i];
          var det = data.PedidosNuevosGex[i].Detalle;
          
    		  if (hey.lat == '') {
    			 $rootScope.log('ER','guardarPedidos', 'Pedido GEX '+hey.numeroPedido+' sin georeferencia, direccion: '+hey.direccionCliente+', '+hey.comuna);
    		  }

          for ( var k in det ) {
            promises.push($rootScope.db.insert('PED1', {
              "sim": $localStorage.app.sim,
                "pedidoOrigen": hey.pedidoOrigen,
                "numeroPedido": hey.numeroPedido,
                "material": k,
                "valor": $localStorage.app.priceListGex[k],
                "cantidad": det[k]
              }).then(function(rs) {
                $rootScope.log('OK','guardarPedidos', '[G] '+hey.numeroPedido+' / Mat: '+k+' / Cant: '+det[k]+' / $ '+$localStorage.app.priceListGex[k]);
              })
            );
          }

          promises.push($rootScope.db.insert('OPED', {
              "sim": $localStorage.app.sim,
              "numeroPedido": hey.numeroPedido,
              "comuna": hey.comuna,
              "fechaPedido": hey.fechaPedido,
              "horaPedido": hey.horaPedido,
              "fechaCompromiso": hey.fechaCompromiso,
              "horaCompromiso": hey.horaCompromiso,
              "rutCliente": hey.rutCliente,
              "nombreCliente": hey.nombreCliente,
              "codigoCliente": hey.codigoCliente,
              "direccionCliente": hey.direccionCliente,
              "referenciaDireccion": hey.referenciaDireccion,
              "observacion": hey.observacion,
              "unixCompromiso": hey.unixCompromiso,
              "TimeLeft": "",
              "TimeLeftSemaforo": "",
              "lat": hey.lat,
              "lng": hey.lng, 
              "pedidoOrigen": hey.pedidoOrigen, 
              "pedidoRecibo": (Math.round(new Date().getTime() / 1000) + ( 3600 * $localStorage.app.timezone )), 
              "pedidoLatRecibe": $localStorage.gpslat, 
              "pedidoLngRecibe": $localStorage.gpslng, 
              "pedidoPrioridad": 0,
              "pedidoEstado": 'N',
              "pedidoModificado": 0
            }).then(function(rs) {
              $rootScope.log('OK','guardarPedidos', '[G] '+hey.numeroPedido+' Terminado');
            }, function(e) {})
          );

          promises.push($rootScope.db.executeQuery("UPDATE OPED SET pedidoEstado = ?, pedidoConfirmado = 0 WHERE sim = ? AND pedidoOrigen = ? AND numeroPedido = ?", ['N',$localStorage.app.sim, '2', hey.numeroPedido]));

        } /* fin for */

        return promises;
    //});
  };

  /* Get Server Timezone */
  var data = { 'action': 'time' };
  $http.post($localStorage.app.restApi, data).
  then(function (response, status, headers, config) {   
      $localStorage.app.timezone = response.data.timezone;
  });

  if ($localStorage.app) {
    if ($localStorage.app.auth == 1) {
      console.log('main.home redirection');
      $state.go("main.home");  
    }
    else {
      console.log('login redirection');
      $state.go("login");
    }
  }
  else {
    console.log('login redirection !app');
    $state.go("login");
  }


})
.directive('elastic', [
    '$timeout',
    function($timeout) {
        return {
            restrict: 'A',
            link: function($scope, element) {
                $scope.initialHeight = $scope.initialHeight || element[0].style.height;
                var resize = function() {
                    element[0].style.height = $scope.initialHeight;
                    element[0].style.height = "" + element[0].scrollHeight + "px";
                };
                element.on("input change", resize);
                $timeout(resize, 0);
            }
        };
    }
])

.config(function($stateProvider, $urlRouterProvider,$ionicConfigProvider) {

  //$ionicConfigProvider.views.maxCache(0);

  $stateProvider
  .state('login', {
    url: '/login',
    cache: false,
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl'
  })

  .state('admin', {
    url: '/admin',
    cache: false,
    templateUrl: 'templates/admin.html',
    controller: 'AdminCtrl'
  })

  .state('versionError', {
    url: '/versionError',
    cache: false,
    templateUrl: 'templates/versionError.html',
    controller: 'VersionErrorCtrl'
  })

  .state('preload', {
    url: '/preload',
    cache: false,
    templateUrl: 'templates/preload.html',
    controller: 'preloadCtrl'
  })

  .state('firstHola', {
    url: '/firstHola',
    cache: false,
    templateUrl: 'templates/firstHola.html',
    controller: 'FirstHolaCtrl'
  })

  .state('printConfig', {
    url: '/printConfig',
    cache: false,
    templateUrl: 'templates/printConfig.html',
    controller: 'PrintConfigCtrl'
  })

  .state('main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main.html',
    controller: 'MainCtrl'
  })

  .state('main.home', {
    url: '/home',
    views: {
      'menuContent': {
        templateUrl: 'templates/home.html',
        controller: 'HomeCtrl'
      }
    },
    params : {
      reloadPrecios: 0
    }
  })

  .state('main.pedidos', {
    url: '/pedidos',
    cache: false,
    views: {
      'menuContent': {
        templateUrl: 'templates/pedidos.html',
        controller: 'PedidosCtrl'
      }
    }
  })

  .state('main.verpedido', {
    url: '/verpedido/:origen/:numero',
    cache: false,
    views: {
      'menuContent': {
        templateUrl: 'templates/verpedido.html',
        controller: 'VerPedidoCtrl',

      }
    }
  })

  .state('main.chat', {
    url: '/chat',
    cache: false,
    views: {
      'menuContent': {
        templateUrl: 'templates/chat.html',
        controller: 'ChatCtrl',
      }
    },
    params: {
      pedido: null
    }
  })

  .state('main.tarreo', {
    url: '/tarreo',
    cache: false,
    views: {
      'menuContent': {
        templateUrl: 'templates/tarreo.html',
        controller: 'TarreoCtrl'
      }
    },
    params : {
      preloadPROMO: null, 
      preloadCUPON: null, 
      preloadDRUT: null,
      preloadHuella: null,
      xml: null
    }
  });
  // if none of the above states are matched, use this as the fallback
  //abstract: true,
});
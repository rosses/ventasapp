angular.module('abastible.controllers').controller('VerPedidoCtrl', function($rootScope, $scope, $http, $ionicModal, $timeout, $location, $localStorage, $stateParams, $state, $ionicHistory, $interval) {

  var origen = $stateParams.origen;
  var numero = $stateParams.numero;
  $scope.titleNumber = numero;
  $scope.alertModificado = "";
  $scope.descuentos = 0;
  $scope.total = 0;

  $scope.addMaterial = {};
  $scope.addMaterial.material = "";
  $scope.addMaterial.cantidad = 1;
  $scope.currentMaterial = 0;

  /* medio de pago bloqueado */
  $scope.bloqueoPromocion = 0;
  $scope.bloqueoCupon = 0;
  $scope.bloqueoDrut = 0;

  /* existe el medio de pago */
  $scope.isPromocion = 0;
  $scope.isCupon = 0;
  $scope.isDrut = 0;

  $scope.drutConsumo = 0; // cantidad de descuento rut aplicados actualmente
  $scope.limiteDrut = 0; // actualizar desde validacion

  /* aux para promocion selector */
  $scope.auxMaterial = "";
  $scope.auxMonto = 0;
  $scope.auxCodigo = "";
  $scope.auxIndex = 0;
  $scope.auxList = [];

  $scope.auxDrut = "";

  $scope.auxMedioPagoCierre = "";

  /* Montos para cierre */
  $scope.montoDrut = 0;

  $scope.devActiva = ""; // devolucion activa

  $scope.onSwipeRight = function() {
    $ionicHistory.goBack();
  }
  $scope.noSwipeRight = function($e) {
    $e.stopPropagation();
  };

  /* usados */
  $scope.usadosPromocion = [];
  $scope.usadosCupon = [];

  /* lista de descuentos para los descuento rut */
  $scope.listaDrut = [];

  $rootScope.db.executeQuery("SELECT * FROM OPED WHERE pedidoOrigen = ? AND numeroPedido = ?", [origen,numero]).then(function(results) {
    for(i=0; i < results.rows.length; i++){
      var row = results.rows.item(i);
    }
    $scope.pedido = row;
  });

  $scope.imageurl="";
  var alertaprecio = 0;
  

  $rootScope.db.executeQuery("SELECT * FROM PED1 WHERE pedidoOrigen = ? AND numeroPedido = ?", [origen,numero]).then(function(results) {
    var det = [];
    for(i=0; i < results.rows.length; i++){
      var obj = results.rows.item(i);
      var detalle_items = [];
      for (j = 0; j < parseInt(obj.cantidad);j++) {
        detalle_items.push({ 
          isPromocion: 0,
          isDrut: 0,
          isCupon: 0,
          montoAplicado: 0,
          codigoPromocion: "",
          codigoDrut: "",
          codigoCupon: ""
        });
      }

      if (isNaN(parseInt(obj.valor)) || obj.valor == "" || obj.valor == 0) {
        alertaprecio = 1;
      }
      obj["items"] = detalle_items;
      det.push(obj);
      $scope.total += (obj.items.length * obj.valor);
    }
    $scope.detAux = det;
    $scope.det = det;
  });

  if (alertaprecio == 1 && origen == 1) {
    //$rootScope.err('Estima');
    if (Object.keys($localStorage.app.priceListBO).length < 1) {
        $rootScope.log('ER','Pedido sin precio', 'Pedido dash '+numero+' tiene una o mas filas sin precio');
        $scope.showload('Actualizando precios del pedido');
        var senddata = {'sim': $localStorage.app.sim, 'action': 'agenda', 'ext': 'precios', 'camion': $localStorage.app.camion };
        $http.post($localStorage.app.restApi, senddata).
        then(function (data, status, headers, config) {      
          if (data.data.res == 'OK') { 
            var promises = $rootScope.guardarPedidos(data.data); // tambien updatea precios
            $.when.apply(null,promises).always(function () {

              if (Object.keys($localStorage.app.priceListBO).length < 1) {
                
                $rootScope.log('KG','Pedido sin precio', 'No llego la lista de precios');
                err('Existe un problema con la lista de precios de este dispositivo. Cierre y abra nuevamente la aplicación. Si el problema persiste contacte a Soporte.');
                $scope.hideload();

              }

              else {

                $scope.hideload();
                alertaprecio = 0;
                // Volver a cargar el pedido, deberia estar updateado
                $rootScope.db.executeQuery("SELECT * FROM PED1 WHERE pedidoOrigen = ? AND numeroPedido = ?", [origen,numero]).then(function(results) {
                  var det = [];
                  for(i=0; i < results.rows.length; i++){
                    var obj = results.rows.item(i);
                    var detalle_items = [];
                    var alertaprecio = 0;
                    for (j = 0; j < parseInt(obj.cantidad);j++) {
                      detalle_items.push({ 
                        isPromocion: 0,
                        isDrut: 0,
                        isCupon: 0,
                        montoAplicado: 0,
                        codigoPromocion: "",
                        codigoDrut: "",
                        codigoCupon: ""
                      });
                    }

                    if (isNaN(parseInt(obj.valor)) || obj.valor == "" || obj.valor == 0) {
                      alertaprecio = 1;
                    }
                    obj["items"] = detalle_items;
                    det.push(obj);
                    $scope.total += (obj.items.length * obj.valor);
                  }
                  $scope.detAux = det;
                  $scope.det = det;
                });

                if (alertaprecio == 1) { 
                  $rootScope.log('KG','Pedido sin precio', 'priceListBO esta poblado pero sigo con lineas en cero.');
                  err('Existe un problema con la lista de precios de este dispositivo. Cierre y abra nuevamente la aplicación. Si el problema persiste contacte a Soporte.');
                }

              }

            });
          }
          else {
            $rootScope.log('KG','Pedido sin precio', 'Servidor no devolvio OK');
            err('Existe un problema con la lista de precios de este dispositivo. Cierre y abra nuevamente la aplicación. Si el problema persiste contacte a Soporte.');
            $scope.hideload();
          }
        },
        function (data, status, headers, config) { 
          $scope.hideload();
        }); 
    }
  }

  $scope.uploadImage = function(element){
      console.log(element.files[0]);
      var FR= new FileReader();
      FR.onload = function(e) {
        //console.log(e);
        //document.getElementById("img").src       = e.target.result;
        //document.getElementById("b64").innerHTML = ;
        $(".labelvistafoto").hide();
        $(".vistapreviafoto").show();
        $(".vistapreviafoto").attr('src', e.target.result);
        //console.log(e.target.result);
      };       
      FR.readAsDataURL( element.files[0] );
      
  };

  /* Waze */
  $scope.isWazeAval = 0;
  /*
  if (default_app.modo != 'dev') {
	var scheme;

	if(cordova.platformId == 'ios') {
	    scheme = 'waze://';
	}
	else if(cordova.platformId == 'android') {
	    scheme = 'com.waze';
	}
  
	appAvailability.check(
	    scheme,       
	    function() {  
	        $scope.isWazeAval = 1;
	    },
	    function() {  
	        $scope.isWazeAval = 0;
	    }
	);
  }
  else {
  	$scope.isWazeAval = 1;
  }
  */

  $scope.gotoWaze = function(lat,lng) {
    /*
  	if ($scope.isWazeAval == 1) { 
  		if(cordova.platformId == 'ios') { window.open('waze://?ll='+lat+','+lng+'&navigate=yes', '_system', 'location=no'); }
  		if(cordova.platformId == 'android') { window.open('http://waze.to/?ll='+lat+','+lng+'&navigate=yes', '_system', 'location=no'); }
  	}
  	else {
  		//$rootScope.err("Función no disponible. No tienes Waze instalado en tu equipo.");
      window.open('http://waze.to/?ll='+lat+','+lng+'&navigate=yes', '_system', 'location=no');
  	}
    */
    WazeLink.open( 'waze://?ll='+lat+','+lng+'' );
  }
  



  /* 
    gestion devolucion
  */
  $scope.activarDevolucion = function(motivo) {
    $scope.devActiva = motivo;
    //console.log($scope.devActiva);
    jQuery(".elegida").removeClass("elegida");
    jQuery("#"+motivo).parent().addClass("elegida");
  };
  /*
   * Funcion para aplicar el descuento rut cargado sobre el pedido.
  */
  $scope.calcularDescuentoRut = function() {
    // descuento rut existe
    if ($scope.isDrut == 1) { 
      /* Reset */
      $scope.drutConsumo = 0; 
      for(i=0; i < $scope.det.length; i++){ 
        for (j=0; j<$scope.det[i].items.length;j++) { 
          if ($scope.det[i].items[j].isDrut == 1) { //solo lo que es drut
            $scope.det[i].items[j].isDrut = 0;
            $scope.det[i].items[j].montoAplicado = 0;
            $scope.det[i].items[j].codigoDrut = "";
          }
        }
      }

      for(a=0; a < $scope.listaDrut.length; a++) { // leer lista precios drut (ordenada precio descendiente)
        for(i=0; i < $scope.det.length; i++){ // leer todas las lineas de detalle
          for (j=0; j<$scope.det[i].items.length;j++) { // leer lineas de material x item
            if ($scope.listaDrut[a].material == $scope.det[i].material) { // es el material de la listadrut
              if ($scope.det[i].items[j].isPromocion == 0 && $scope.det[i].items[j].isCupon == 0 && $scope.drutConsumo < $scope.limiteDrut) { // no tiene cupon ni promocion
                $scope.drutConsumo++;
                $scope.det[i].items[j].isDrut = 1;
                $scope.det[i].items[j].montoAplicado = $scope.listaDrut[a].monto;
                $scope.det[i].items[j].codigoDrut = $scope.auxDrut;
              }
            }
          }
        } 
      }
    }
  };

  $scope.itemTrash = function(mat) {
    for (var i = 0;i<$scope.det.length;i++) {
      if ($scope.det[i].material == mat) {
        // revisar promociones y cupones, descuento rut es dinamico
        for (j = 0; j < $scope.det[i].items.length ; j++ ) {
          if ($scope.det[i].items[j].isPromocion == 1) {
            var index = $scope.usadosPromocion.indexOf($scope.det[i].items[j].codigoPromocion);
            if (index >= 0) {
              $scope.usadosPromocion.splice( index, 1 );
            }
          }
          if ($scope.det[i].items[j].isCupon == 1) {
            var index = $scope.usadosCupon.indexOf($scope.det[i].items[j].codigoCupon);
            if (index >= 0) {
              $scope.usadosCupon.splice( index, 1 );
            }
          }
        }
        $scope.det.splice(i, 1); // borra i
        break;
      }
    }
    $scope.alertModificado = "(MODIFICADO)";
    $scope.calcularTotales();
  };

  $scope.slickConfig = {
    enabled: true,
    method: {},
    event: {
        beforeChange: function (event, slick, currentSlide, nextSlide) {
          
        },
        afterChange: function (event, slick, currentSlide, nextSlide) {
          $scope.currentMaterial = currentSlide;
        }
    }
  };

  $scope.slickConfig2 = {
    method: {},
    event: {
        afterChange: function (event, slick, currentSlide, nextSlide) {
          $scope.auxIndex = currentSlide;
        }
    }
  };

  /* INICIO VENTANA MODAL */
  /* SELECCION MATERIAL PROMOCIONES */
  $ionicModal.fromTemplateUrl('templates/addMaterialPromocion.html', {
    scope: $scope,
    animation: 'slide-in-right'
  }).then(function(modal) {
    $scope.seleccionMaterialPromocion = modal;
  });

  // cerrar modal seleccion material promocion
  $scope.closeSeleccionMaterialPromocion = function() {
    $scope.seleccionMaterialPromocion.hide();
  };

  // abrir modal seleccion material promocion
  $scope.openSeleccionMaterialPromocion = function() {
    $scope.seleccionMaterialPromocion.show();
  };

  $scope.closePedidoTerminado = function() {
    $scope.terminadoModal.hide();
    $scope.terminadoModal.remove();
  };
  $scope.PedidoTerminado = function() {
    $scope.showload();
    $scope.cerrarPedido('ent',$scope.auxMedioPagoCierre ,($scope.total+$scope.descuentos), '', '', '', $scope.descuentos, $scope.total, '', '');
  };

  $scope.closeDevolucion = function() {
    $scope.devolucionModal.hide();
    $scope.devolucionModal.remove(); 
  };

  $scope.openDevolucion = function() {
    $ionicModal.fromTemplateUrl('templates/addDevolucion.html', {
      scope: $scope,
      animation: 'slide-in-right'
    }).then(function(modal) {
      $scope.devolucionModal = modal;
      $scope.devActiva = "";
      $(".elegida").removeClass("elegida");
      $scope.devolucionModal.show();
    });
  };

  /* FIN VENTANA MODAL */ 
  /* DEVOLUCION ANULACION */

  /* INICIO VENTANA MODAL */
  /* AGREGAR MEDIO DE PAGO */
  $ionicModal.fromTemplateUrl('templates/addMedioPago.html', {
    scope: $scope,
    animation: 'slide-in-right'
  }).then(function(modal) {
    $scope.agregarMedioPago = modal;
  });

  // cerrar modal add material
  $scope.closeAddMedioPago = function() {
    $scope.agregarMedioPago.hide();
  };

  // abrir modal add material
  $scope.openAddMedioPago = function() {
  	$scope.currentMaterial = 0;
    $scope.agregarMedioPago.show();
  };

  $ionicModal.fromTemplateUrl('templates/addPago.html', {
    scope: $scope,
    animation: 'slide-in-right'
  }).then(function(modal) {
    $scope.agregarPago = modal;
  });

  // cerrar modal add material
  $scope.closeAddPago = function() {
    $scope.agregarPago.hide();
  };

  // abrir modal add material
  $scope.openAddPago = function() {
    $scope.agregarPago.show();
  };


  /* FIN VENTANA MODAL */ 
  /* AGREGAR MEDIO DE PAGO */

  /* INICIO VENTANA MODAL */
  /* AGREGAR MATERIAL */

  $ionicModal.fromTemplateUrl('templates/addMaterialSlick.html', {
    scope: $scope,
    animation: 'slide-in-right'
  }).then(function(modal) {
    $scope.agregarMaterialModal = modal;
  });

  // cerrar modal add material
  $scope.closeAddMaterial = function() {
    $scope.agregarMaterialModal.hide();
  };

  // abrir modal add material
  $scope.openAddMaterial = function() {
    $scope.agregarMaterialModal.show();
    $scope.addMaterial.material = mat[0];
    $scope.addMaterial.cantidad = 1;
  };
  $scope.addMaterialNew = function() {
    if ($scope.addMaterial.cantidad < 99) {
      $scope.addMaterial.cantidad = $scope.addMaterial.cantidad + 1;
    }    
  };
  $scope.modalMatMenos = function() {
    if ($scope.addMaterial.cantidad < 2) {
      $scope.addMaterial.cantidad = 1;
    }
    else {
      $scope.addMaterial.cantidad = $scope.addMaterial.cantidad - 1;
    }
  };
  $scope.modalMatMas = function() {
    if ($scope.addMaterial.cantidad < 99) {
      $scope.addMaterial.cantidad = $scope.addMaterial.cantidad + 1;
    }
  };
  $scope.modalMatClick = function() {
    if ($scope.addMaterial.cantidad > 0) {
      $scope.addMaterial.material = mat[$scope.currentMaterial];
      var indexAdd = 666;
      /* buscar si existe */
      for (var i = 0;i<$scope.det.length;i++) {
        if ($scope.det[i].material == $scope.addMaterial.material) {
          indexAdd = i;
          break;
        }
      }

      var itms = [];
      for (var p=0;p<parseInt($scope.addMaterial.cantidad);p++) {
        var q = {
          isPromocion: 0,
          isDrut: 0,
          isCupon: 0,
          montoAplicado: 0,
          codigoCupon: "",
          codigoPromocion: "",
          codigoDrut: ""
        };
        itms.push(q);
      }
      
      if (indexAdd == 666) {
        var o = {
          numeroPedido: $scope.pedido.numeroPedido,
          pedidoOrigen: $scope.pedido.pedidoOrigen,
          material: $scope.addMaterial.material,
          cantidad: $scope.addMaterial.cantidad,
          valor: ($localStorage.app.priceList[$scope.addMaterial.material] ? $localStorage.app.priceList[$scope.addMaterial.material] : 0),
          items: itms
        }
        $scope.det.push(o);
      }
      else {
        // actualizar
        $scope.det[indexAdd].cantidad = $scope.det[indexAdd].cantidad + $scope.addMaterial.cantidad;
        $scope.det[indexAdd].items = $scope.det[indexAdd].items.concat(itms);
      }
      $scope.alertModificado = "(MODIFICADO)";
      $scope.calcularTotales();
      // reset
      $scope.addMaterial.cantidad = 1;
    }
  };

  $scope.calcularTotales = function() { 
    var suma = 0;
    var montoDrut = 0;
    var montoCupon = 0;
    var montoPromocion = 0;
    $scope.calcularDescuentoRut();
    for (var i = 0;i<$scope.det.length;i++) {
      suma += parseInt($scope.det[i].items.length * $scope.det[i].valor);
      for (var j = 0; j<$scope.det[i].items.length;j++) {
       if ($scope.det[i].items[j].isDrut == 1) { montoDrut += parseInt($scope.det[i].items[j].montoAplicado); }
       if ($scope.det[i].items[j].isCupon == 1) { montoCupon += parseInt($scope.det[i].items[j].montoAplicado); }
       if ($scope.det[i].items[j].isPromocion == 1) { montoPromocion += parseInt($scope.det[i].items[j].montoAplicado); }
      }
    }
    $scope.montoDrut = parseInt(montoDrut);
    $scope.descuentos = parseInt(montoDrut) + parseInt(montoCupon) + parseInt(montoPromocion); // cupon, promocion
    $scope.total = (parseInt(suma) - parseInt($scope.descuentos));
  };

  // Cierre del pedido (medio de pago y monto que cancela la diferencia)
  $scope.cerrarPedido = function(tipo, medio, monto, codDevolucion, motDevolucion, obsDevolucion, total_descuentos, total_pagar, motivo, observa) {
    //$scope.closeAddMedioPago();

    $rootScope.log('OK','cerrarPedido', 'Inicio de cierre de pedido - TipoVoucher: '+tipo+', MedioPago: '+medio+', Monto: '+monto+', Descuentos: '+total_descuentos+', codDevolucion: '+codDevolucion+', Motivo: '+motivo);

    var productoNode = "";
    var productoNodeGex = '<ABA_PEDIDO_DETALLE xmlns="http://pedido.model.ws.erpdist.abastible.com">';
    var mediosNodeGex = '<ABA_MEDIO_PAGO xmlns="http://pedido.model.ws.erpdist.abastible.com">';

    var OCAN_iterate = [];
    mediosOK = [];
    mediosERR = [];

    var promocionesCanje = [];
    var cuponesCanje = [];
    var drutRut = "";
    var drutCanje = [];
    var lineas = [];
    
    for (var i = 0; i < $scope.det.length; i++ ) {
      var material = $scope.det[i].material;
      var valorbase = $scope.det[i].valor;
      var suma_diferencias = 0;
      var suma_normal = 0;
      for (var j = 0; j < $scope.det[i].items.length ; j++) {
        if ($scope.det[i].items[j].isPromocion == 1 || $scope.det[i].items[j].isCupon == 1 || $scope.det[i].items[j].isDrut == 1) {
          suma_diferencias += (parseInt(valorbase) - parseInt($scope.det[i].items[j].montoAplicado));
        }
        else {
          suma_diferencias += parseInt(valorbase);
        }
        suma_normal += parseInt(valorbase);
        // para canje
        if ($scope.det[i].items[j].isPromocion == 1) {
          promocionesCanje.push($scope.det[i].items[j].codigoPromocion);
        }
        if ($scope.det[i].items[j].isCupon == 1) {
          cuponesCanje.push($scope.det[i].items[j].codigoCupon);
        }
        if ($scope.det[i].items[j].isDrut == 1) {
          drutRut = $scope.det[i].items[j].codigoDrut;
          drutCanje.push({material: $scope.det[i].material, monto: $scope.det[i].items[j].montoAplicado, cantidad: 1});
        }
      }
      productoNode += "<item><codigoProducto>"+material+"</codigoProducto><cantidad>"+parseInt($scope.det[i].items.length)+"</cantidad><precio>"+suma_normal+"</precio></item>";
      productoNodeGex += "<item xmlns:gex=\"http://ws.erpdist.abastible.com\"> \
                            <FA_NRO_DOCUMENTO xmlns=\"http://pedido.model.ws.erpdist.abastible.com\">"+$scope.pedido.numeroPedido+"</FA_NRO_DOCUMENTO> \
                            <FD_CANTIDAD xmlns=\"http://pedido.model.ws.erpdist.abastible.com\">"+parseInt($scope.det[i].items.length)+"</FD_CANTIDAD> \
                            <MA_CODIGO xmlns=\"http://pedido.model.ws.erpdist.abastible.com\">"+material+"</MA_CODIGO> \
                          </item>";
      lineas.push({material: material, cantidad: parseInt($scope.det[i].items.length), precio: parseInt(suma_normal)});
    }
    productoNodeGex = productoNodeGex + "</ABA_PEDIDO_DETALLE>";
    

    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; 

    var yyyy = today.getFullYear();
    if(dd<10){
        dd='0'+dd;
    } 
    if(mm<10){
        mm='0'+mm;
    }

    /* *********************************** */
    /* GENERAR PROMISES DE CANJES PARA SAP */
    /* *********************************** */

    for (var n = 0; n < promocionesCanje.length ; n++) {
      OCAN_iterate.push({
        numeroPedido: $scope.pedido.numeroPedido,
        pedidoOrigen: $scope.pedido.pedidoOrigen,
        material: "", 
        monto: "", 
        cantidad: "", 
        mediopago: "VAL", 
        codigo: promocionesCanje[n],
        envioOK: 0, 
        msgCallback: "", 
        sapCodigo: ""
      });
    }

    for (var n = 0; n < cuponesCanje.length ; n++) {
      OCAN_iterate.push({
        numeroPedido: $scope.pedido.numeroPedido,
        pedidoOrigen: $scope.pedido.pedidoOrigen,
        material: "", 
        monto: "", 
        cantidad: "", 
        mediopago: "CUP", 
        codigo: cuponesCanje[n],
        envioOK: 0, 
        msgCallback: "", 
        sapCodigo: ""
      });
    }

    if (drutCanje.length > 0) {
      var mats = "";
      var montos = "";
      var cants = "";
      for (var h=0;h < drutCanje.length;h++) {
        mats = mats + (mats=="" ? '' : ',') +drutCanje[h].material;
        montos = montos + (montos=="" ? '' : ',') +drutCanje[h].monto;
        cants = cants + (cants=="" ? '' : ',') +drutCanje[h].cantidad;
      }

      OCAN_iterate.push({
        numeroPedido: $scope.pedido.numeroPedido,
        pedidoOrigen: $scope.pedido.pedidoOrigen,
        material: mats, 
        monto: montos, 
        cantidad: cants, 
        mediopago: "DRUT", 
        codigo: drutRut,
        envioOK: 0, 
        msgCallback: "", 
        sapCodigo: ""
      });
    }

    
    if (tipo == 'ent') {  /* Gestión de canje solo en entregas */
      /* **********************************
      COMENZAR CANJE DE LOS MEDIOS DE PAGO
      ************************************ */

      var canjes = $rootScope.canjearMedios(OCAN_iterate);
      var canjes_apply = $.whenAll.apply(null,canjes);

    } // fin de tipo ent (entrega)

    else { // dev. o anulacion
      var canjes_apply = $.whenAll.apply(null,[]); // definicion de promise no hace nada (array vacio)

    }

    // CERRAR PEDIDO
    canjes_apply.done(function() {

      var str = "" + $scope.pedido.numeroPedido;
      var pad = "0000000000";
      var ans = pad.substring(0, pad.length - str.length) + str;

      //console.log('mediosERR');
      //console.log(mediosERR);
      //console.log('mediosOK');
      //console.log(mediosOK);

      /* ************* XML DASH ************* */
      if ($scope.pedido.pedidoOrigen == 1) {
      	$rootScope.log('OK','cerrarPedido', 'Pedido '+$scope.pedido.numeroPedido+' DASH');
        var soapRequest =
        '<?xml version="1.0" encoding="utf-8"?> \
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"> \
        <soapenv:Header/> \
          <soapenv:Body> \
            <dash:recibeEntregaCierreSmart xmlns:dash="http://webservice_pda.v2.base.abastible.com/"> \
              <sim>' + $localStorage.app.sim + '</sim> \
              <pedidosCerrados> \
                <pedidoCerrado> \
                  <tipo>'+(tipo=='ent' ? 'CEEN' : (tipo=='dev' ? codDevolucion : 'CEAN'))+ '</tipo> \
                  '+(tipo=='dev' ? '<codDevolucion>'+mstrdev[codDevolucion].id+'</codDevolucion>' : (tipo=='ent' ? '<codDevolucion>'+mstrdev.CEEN.id+'</codDevolucion>' : '<codDevolucion>'+mstrdev.CEAN.id+'</codDevolucion>'))+ ' \
                  '+(tipo=='dev' ? '<motDevolucion>'+mstrdev[codDevolucion].descripcion+'</motDevolucion>' : (tipo=='ent' ? '<motDevolucion>'+mstrdev.CEEN.descripcion+'</motDevolucion>' : '<motDevolucion>'+mstrdev.CEAN.descripcion+'</motDevolucion>'))+ ' \
                  '+(tipo=='dev' ? '<obsDevolucion>'+observa+'</obsDevolucion>' : '<obsDevolucion></obsDevolucion>')+ ' \
                  <numeroPedido>'+ans+'</numeroPedido> \
                  <fechaHoraEntrega>'+dd+'/'+mm+'/'+yyyy+' '+(today.toTimeString().split(' ')[0])+'</fechaHoraEntrega> \
                  <totalVenta>'+monto+'</totalVenta> \
                  '+(tipo=='ent' ? '<formaPago>'+medio+'</formaPago>' : '<formaPago></formaPago>')+ ' \
                  '+(tipo=='ent' ? '<descuentoDrut>'+$scope.montoDrut+'</descuentoDrut>' : '<descuentoDrut></descuentoDrut>')+ ' \
                  <codCMR></codCMR> \
                  <numeroCMR></numeroCMR> \
                  <numeroTransaccionCMR></numeroTransaccionCMR> \
                  <productos> \
                     '+productoNode+' \
                  </productos> \
                  <latitud>'+$localStorage.gpslat+'</latitud> \
                  <longitud>'+$localStorage.gpslng+'</longitud> \
                  <imagen>'+($scope.imageurl!="" ? $scope.imageurl : "")+'</imagen> \
                  <nombreImg>'+($scope.imageurl!="" ? ans : "")+'</nombreImg> \
                  <extensionImg>'+($scope.imageurl!="" ? "jpg" : "")+'</extensionImg> \
                </pedidoCerrado> \
              </pedidosCerrados> \
            </dash:recibeEntregaCierreSmart> \
          </soapenv:Body> \
        </soapenv:Envelope>';
        $rootScope.log('OK','cerrarPedido', soapRequest);
      }

      else {
        /* ************** XML GEX ********************* */
        $rootScope.log('OK','cerrarPedido', 'Pedido '+$scope.pedido.numeroPedido+' GEX');
        /* *************** ARMAR MEDIO PAGO ************ */
        for (t=0;t<mediosOK.length;t++) {
          mediosNodeGex = mediosNodeGex + "<item xmlns=\"http://pedido.model.ws.erpdist.abastible.com\"> \
                                              <DDV_CODIGO xmlns=\"http://pedido.model.ws.erpdist.abastible.com\">"+mediosOK[t].codigo+"</DDV_CODIGO> \
                                              <DDV_MONTO xmlns=\"http://pedido.model.ws.erpdist.abastible.com\">"+mediosOK[t].monto+"</DDV_MONTO> \
                                              <MA_CODIGO xmlns=\"http://pedido.model.ws.erpdist.abastible.com\">"+mediosOK[t].material+"</MA_CODIGO> \
                                              <TEL_CODIGO xmlns=\"http://pedido.model.ws.erpdist.abastible.com\">"+mediosOK[t].mediopago+"</TEL_CODIGO> \
                                              <RUT xmlns=\"http://pedido.model.ws.erpdist.abastible.com\">"+mediosOK[t].rut+"</RUT> \
                                              </item>";
        }
        mediosNodeGex = mediosNodeGex + "</ABA_MEDIO_PAGO>";

        var soapRequest =
        '<?xml version="1.0" encoding="utf-8"?> \
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"> \
        <soapenv:Header/> \
          <soapenv:Body> \
            <setEstadoPed xmlns="http://ws.erpdist.abastible.com"> \
              <args>' + $localStorage.app.sim + '</args> \
              <pedido> \
                <ED_CODIGO xmlns="http://pedido.model.ws.erpdist.abastible.com">'+(tipo=='ent' ? 'CEEN' : (tipo == 'dev' ? codDevolucion : 'CEAN'))+ '</ED_CODIGO> \
                <FA_NRO_DOCUMENTO xmlns="http://pedido.model.ws.erpdist.abastible.com">'+$scope.pedido.numeroPedido+ '</FA_NRO_DOCUMENTO> \
                <FA_OBSERVACION xmlns="http://pedido.model.ws.erpdist.abastible.com">'+observa+'</FA_OBSERVACION> \
                '+(tipo=='ent' ? '<TP_CODIGO xmlns="http://pedido.model.ws.erpdist.abastible.com">C</TP_CODIGO><MENSAJE />':'')+' \
                '+productoNodeGex+' \
                '+mediosNodeGex+' \
              </pedido> \
            </setEstadoPed> \
          </soapenv:Body> \
        </soapenv:Envelope>';

        $rootScope.log('OK','cerrarPedido', soapRequest);

      }


      var printPromise = $rootScope.ConnectPrinter();
      var send_drut = "";
      
      printPromise.done(function() { 
        for (i=0; i < mediosOK.length ; i++) {
          if (mediosOK[i].mediopago == "DRUT") { send_drut = mediosOK[i].codigo; }
        }
        
        if (send_drut != "" && $localStorage.abaOnPrinter == 0) {
          $scope.hideload();
          $rootScope.log('ER','cerrarTarreo+Print C/DRUT S/IMPR','No autoriza cierre con impresora deshabilitada');
          $rootScope.err('No fue posible cerrar la venta, pedidos con descuento rut no operan con impresora deshabilitada');
          for (i=0; i < mediosOK.length ; i++) {
            $rootScope.reversarCanje(mediosOK[i].mediopago, mediosOK[i].codigo); 
          }
        }
        else {
          jQuery.ajax({
            type: "POST",
            url: ($scope.pedido.pedidoOrigen == 1 ? default_app.wsdash : default_app.wsgex),
            contentType: "text/xml",
            dataType: "xml",
            data: soapRequest,
            headers: {
                SOAPAction: ''
            },
            success: function(data) {
              $rootScope.log('OK','cerrarPedido+Print', new XMLSerializer().serializeToString(data));

              if (tipo == 'ent') {
                $rootScope.db.executeQuery("UPDATE OPED SET pedidoEstado = 'C', motivoCierre = ? WHERE pedidoOrigen = ? AND numeroPedido = ?", ['CEEN',$scope.pedido.pedidoOrigen,$scope.pedido.numeroPedido]).then(function(results) {
                  $scope.hideload();
                  $rootScope.saveCierre($scope.pedido.pedidoOrigen, $scope.pedido.numeroPedido, 'CEEN', $localStorage.gpslat, $localStorage.gpslng, $localStorage.gpslast, '', '');

                  $scope.terminadoModal.hide();

                  if ($localStorage.abaOnPrinter == 1) {
                    $rootScope.imprimeCierre($scope.pedido.numeroPedido,  // numero pedido imprime
                                             dd+'/'+mm+'/'+yyyy+' '+(today.toTimeString().split(' ')[0]),  //fecha
                                             send_drut, // descuento rut (puede ser "")
                                             medio,  // medio de pago
                                             lineas, // detalle
                                             total_descuentos, // descuentos totales
                                             total_pagar,
                                             'ent', // layout
                                             '',
                                             '',
                                             1 // is pedido
                                             );
                  }

                  $ionicHistory.clearCache().then(function(){
                    $state.go( "main.pedidos", {}, {reload: true});
                  });
                });
              }
              if (tipo == 'dev') {
                $rootScope.db.executeQuery("UPDATE OPED SET pedidoEstado = 'D', motivoCierre = ? WHERE pedidoOrigen = ? AND numeroPedido = ?", [codDevolucion,$scope.pedido.pedidoOrigen,$scope.pedido.numeroPedido]).then(function(results) {
                  $scope.hideload();
                  if ($localStorage.abaOnPrinter == 1) {
                    $rootScope.imprimeCierre($scope.pedido.numeroPedido,  // numero pedido imprime
                                             dd+'/'+mm+'/'+yyyy+' '+(today.toTimeString().split(' ')[0]),  //fecha
                                             "", // descuento rut (puede ser "")
                                             "",  // medio de pago
                                             [], // detalle
                                             0, // descuentos totales
                                             0,
                                             'dev', // layout
                                             codDevolucion,
                                             observa,
                                             1 // is pedido
                                             );
                  }
                  $rootScope.saveCierre($scope.pedido.pedidoOrigen, $scope.pedido.numeroPedido, codDevolucion, $localStorage.gpslat, $localStorage.gpslng, $localStorage.gpslast, $scope.imageurl, observa);

                  $scope.closeDevolucion();
                  $ionicHistory.clearCache().then(function(){
                    $state.go( "main.pedidos", {}, {reload: true});
                  });
                });
              }
              if (tipo == 'anu') {
                $rootScope.db.executeQuery("UPDATE OPED SET pedidoEstado = 'X', motivoCierre = ? WHERE pedidoOrigen = ? AND numeroPedido = ?", ['CEAN', $scope.pedido.pedidoOrigen,$scope.pedido.numeroPedido]).then(function(results) {
                  $scope.hideload();

                  if ($localStorage.abaOnPrinter == 1) {
                    $rootScope.imprimeCierre($scope.pedido.numeroPedido,  // numero pedido imprime
                                             dd+'/'+mm+'/'+yyyy+' '+(today.toTimeString().split(' ')[0]),  //fecha
                                             "", // descuento rut (puede ser "")
                                             "",  // medio de pago
                                             [], // detalle
                                             0, // descuentos totales
                                             0,
                                             'anu', // layout
                                             codDevolucion,
                                             observa,
                                             1 // is pedido
                                             );
                  }
                  $rootScope.saveCierre($scope.pedido.pedidoOrigen, $scope.pedido.numeroPedido, 'CEAN', $localStorage.gpslat, $localStorage.gpslng, $localStorage.gpslast, $scope.imageurl, observa);

                  $scope.closeDevolucion();
                  $ionicHistory.clearCache().then(function(){
                    $state.go( "main.pedidos", {}, {reload: true});
                  });
                });
              }

            },
            error: function(data) {
              $scope.hideload();
              $rootScope.log('ER','cerrarPedido+Print', new XMLSerializer().serializeToString(data));
              if (tipo == 'ent') {
                $rootScope.err('No fue posible cerrar el pedido, revise su conexión o intente nuevamente');
                for (i=0; i < mediosOK.length ; i++) {
                  $rootScope.reversarCanje(mediosOK[i].mediopago, mediosOK[i].codigo); 
                }
              }
              if (tipo == 'dev') {
                $rootScope.err('No fue posible indicar la devolución, revise su conexión o intente nuevamente');
              }
              if (tipo == 'anu') {
                $rootScope.err('No fue posible indicar la anulación, revise su conexión o intente nuevamente');
              }
            } 
          });
        }
      });

      printPromise.fail(function() { 
        for (i=0; i < mediosOK.length ; i++) {
          if (mediosOK[i].mediopago == "DRUT") { send_drut = mediosOK[i].codigo; }
        }
        if (send_drut != '') {
          $rootScope.log('OK','cerrarPedido+NoPrint', 'No se ofrece terminar por tener descuento RUT');
          console.log('Canjes no realizados, reversar (print promise)');
          for (i=0; i < mediosOK.length ; i++) {
            $rootScope.reversarCanje(mediosOK[i].mediopago, mediosOK[i].codigo); 
          }
          $scope.hideload();
          $rootScope.err("La impresora no está lista. No se puede cerrar el pedido con descuento rut sin imprimir el voucher");
        }

        else {
          $rootScope.log('OK','cerrarPedido+NoPrint', 'Se ofrece terminar sin impresora');
          $scope.hideload();
          $rootScope.confirmar('La impresora está apagada o fuera de alcance, ¿Desea continuar sin imprimir el voucher?', function() {
            $scope.showload();
            jQuery.ajax({
              type: "POST",
              url: ($scope.pedido.pedidoOrigen == 1 ? default_app.wsdash : default_app.wsgex),
              contentType: "text/xml",
              dataType: "xml",
              data: soapRequest,
              headers: {
                  SOAPAction: ''
              },
              success: function(data) {
              	$rootScope.log('OK','cerrarPedido+NoPrint', new XMLSerializer().serializeToString(data));
                if (tipo == 'ent') {
	              $rootScope.db.executeQuery("UPDATE OPED SET pedidoEstado = 'C', motivoCierre = ? WHERE pedidoOrigen = ? AND numeroPedido = ?", ['CEEN', $scope.pedido.pedidoOrigen,$scope.pedido.numeroPedido]).then(function(results) {
	                $scope.hideload();
	                $rootScope.ok('Pedido cerrado con éxito');
                  $rootScope.saveCierre($scope.pedido.pedidoOrigen, $scope.pedido.numeroPedido, 'CEEN', $localStorage.gpslat, $localStorage.gpslng, $localStorage.gpslast,'','');
	                $scope.terminadoModal.hide();
	                $ionicHistory.clearCache().then(function(){
	                  $state.go( "main.pedidos", {}, {reload: true});
	                });
	              });
                }
                if (tipo == 'dev') {
                  $rootScope.db.executeQuery("UPDATE OPED SET pedidoEstado = 'D', motivoCierre = ? WHERE pedidoOrigen = ? AND numeroPedido = ?", [codDevolucion, $scope.pedido.pedidoOrigen,$scope.pedido.numeroPedido]).then(function(results) {
                    $scope.hideload();
                    $rootScope.ok('Pedido devuelto con éxito');
                    $scope.closeDevolucion();
                    $rootScope.saveCierre($scope.pedido.pedidoOrigen, $scope.pedido.numeroPedido, codDevolucion, $localStorage.gpslat, $localStorage.gpslng, $localStorage.gpslast, $scope.imageurl, observa );
                    $ionicHistory.clearCache().then(function(){
                      $state.go( "main.pedidos", {}, {reload: true});
                    });
                  });
                }
                if (tipo == 'anu') {
                  $rootScope.db.executeQuery("UPDATE OPED SET pedidoEstado = 'X', motivoCierre = ? WHERE pedidoOrigen = ? AND numeroPedido = ?", ['CEAN', $scope.pedido.pedidoOrigen,$scope.pedido.numeroPedido]).then(function(results) {
                    $scope.hideload();
                    $rootScope.ok('Pedido anulado con éxito');
                    $rootScope.saveCierre($scope.pedido.pedidoOrigen, $scope.pedido.numeroPedido, 'CEAN', $localStorage.gpslat, $localStorage.gpslng, $localStorage.gpslast, '');
                    $scope.closeDevolucion();
                    $ionicHistory.clearCache().then(function(){
                      $state.go( "main.pedidos", {}, {reload: true});
                    });
                  });
                }

              },
              error: function(data) {
              	$rootScope.log('ER','cerrarPedido+NoPrint', new XMLSerializer().serializeToString(data));
                $scope.hideload();
                if (tipo == 'ent') {
                  $rootScope.err('No fue posible cerrar el pedido, revise su conexión o intente nuevamente');
                  console.log('Canjes no realizados, reversar (print promise)');
                  for (i=0; i < mediosOK.length ; i++) {
                    $rootScope.reversarCanje(mediosOK[i].mediopago, mediosOK[i].codigo); 
                  }
                }
                if (tipo == 'dev') {
                  $rootScope.err('No fue posible indicar la devolución, revise su conexión o intente nuevamente');
                }
                if (tipo == 'anu') {
                  $rootScope.err('No fue posible indicar la anulación, revise su conexión o intente nuevamente');
                }
              } 
            });
          }, function() { 
            $scope.hideload();  
            $rootScope.log('KG','cerrarPedido+Cancel', 'Usuario no acepto cerrar pedido sin imprimir');
            console.log('Canjes no realizados, reversar (no continua)');
            for (i=0; i < mediosOK.length ; i++) {
              $rootScope.reversarCanje(mediosOK[i].mediopago, mediosOK[i].codigo); 
            }
          });
        }


      });
    });

    canjes_apply.fail(function() {
      $rootScope.log('ER','cerrarPedido', 'Error en algun medio de pago, se anula cierre');
      console.log('Canjes no realizados, reversar (canjes promise)');
      for (i=0; i < mediosOK.length ; i++) {
        $rootScope.reversarCanje(mediosOK[i].mediopago, mediosOK[i].codigo); 
      }
      $scope.hideload();

    });

  };
  /* FIN VENTANA MODAL */ 
  /* AGREGAR MATERIAL */

  $scope.cerrarPedidoSimple = function() {
    $scope.auxMedioPagoCierre = '';

    $ionicModal.fromTemplateUrl('templates/pedidoTerminado.html', {
      scope: $scope,
      animation: 'slide-in-right'
    }).then(function(modal) {
      $scope.terminadoModal = modal;
      $scope.terminadoModal.show();
      $scope.closeAddMedioPago();
    });
  }

  $scope.addMpEfectivoPedido = function() {

    if ( parseInt($scope.total) > 0) {
      $scope.auxMedioPagoCierre = 'EFECTIVO';

      $ionicModal.fromTemplateUrl('templates/pedidoTerminado.html', {
        scope: $scope,
        animation: 'slide-in-right'
      }).then(function(modal) {
        $scope.terminadoModal = modal;
        $scope.terminadoModal.show();
        //$scope.closeAddMedioPago();
        $scope.closeAddPago();
      });

    }
    else {
      $rootScope.err('La diferencia a pagar es cero, no puede pagar con efectivo');
    }
  };

  $scope.addMpRedcompraPedido = function() {

    if ( parseInt($scope.total) > 0) {
      $scope.auxMedioPagoCierre = 'REDCOMPRA';

      $ionicModal.fromTemplateUrl('templates/pedidoTerminado.html', {
        scope: $scope,
        animation: 'slide-in-right'
      }).then(function(modal) {
        $scope.terminadoModal = modal;
        $scope.terminadoModal.show();
        //$scope.closeAddMedioPago();
        $scope.closeAddPago();
      });

    }
    else {
      $rootScope.err('La diferencia a pagar es cero, no puede pagar con efectivo');
    }
  };

  $scope.addMpChequePedido = function() {
    if ( parseInt($scope.total) > 0) {

    $scope.auxMedioPagoCierre = 'CHEQUE';
    $ionicModal.fromTemplateUrl('templates/pedidoTerminado.html', {
      scope: $scope,
      animation: 'slide-in-right'
    }).then(function(modal) {
      $scope.terminadoModal = modal;
      $scope.terminadoModal.show();
      //$scope.closeAddMedioPago();
      $scope.closeAddPago();
    });

    }
    else {
      $rootScope.err('La diferencia a pagar es cero, no puede pagar con cheque');
    }

  };

  $scope.addMpDrutPedido = function() {
   var reemplazaAuth = 1;
   if ($scope.isDrut == 1) {
    reemplazaAuth = 0;
    $rootScope.err('Ya existe un RUT para descuento asociado al pedido.');
    //if (!$rootScope.confirmar('Ya existe un RUT para descuento asociado al pedido, ¿desea reemplazarlo?')) {
    //  reemplazaAuth = 0;
    //}
   }

   if ($scope.bloqueoDrut == 0 && reemplazaAuth == 1) {
       if (default_app.modo == "dev") {
        $scope.showload();
        //validarDrut($localStorage.app.sim, "16624648-2").then(function(resp){
        var dr = prompt('DESCUENTO RUT');
        validarDrut($localStorage.app.sim, dr).then(function(resp){
          $scope.hideload();
          var $xml = $( resp );
          if ($xml.find('EL_RESPUESTA').text() == '001') { //error
            $rootScope.err($xml.find('EL_MENSAJE').text());
          }
          else {
            var res = [];
            $scope.auxDrut = dr;
            $xml.find('TB_CONSULTADET>item').each(function(index) {
              $scope.listaDrut.push({
                material: $(this).find("material").text(),
                monto: parseInt($(this).find("monto").text())
              });
              $rootScope.conveniodrut_fix = $(this).find("convenio").text();
              $scope.limiteDrut = parseInt($(this).find("cantidad").text()); // cantidad es el limite de materiales a rebajar
            });
            // ordena listaDrut desde el mas caro.
            $scope.listaDrut.sort(function(a,b) {return (a.monto < b.monto) ? 1 : ((b.monto < a.monto) ? -1 : 0);} ); 
            $scope.isDrut = 1;

            $rootScope.ok('Se aplicó descuento RUT a esta venta');
            $scope.calcularTotales();
            $scope.closeAddMedioPago();
          }
        });
       }
       else { 
       cordova.plugins.barcodeScanner.scan(
          function (result) {
            if (result.cancelled == 1) {
              $rootScope.err("No se ha leído ninguna cédula de identidad");
            }
            else {
              var ok_lectura = 0;
              if (result.format == "QR_CODE") { // cedula >= 2010
                //https://portal.sidiv.registrocivil.cl/usuarios-portal/pages/DocumentRequestStatus.xhtml?RUN=16624648-2&type=CEDULA&serial=105711008
                var rutLeido = result.text.split("?RUN=");
                if (rutLeido[1]) {
                  var amp = rutLeido[1].split("&");
                  rutLeido = amp[0];
                  ok_lectura = 1;  
                }
                else { ok_lectura = 0; }
              }
              else if (result.format == "PDF_417") { // cedula <= 2010
                if (result.text.length > 19) {
                  var allrut = $.trim(result.text.substring(0,9));
                  var x_dv = allrut.substring(allrut.length - 1);
                  var x_rut = allrut.substring(0,(allrut.length-1));

                  var rutLeido = x_rut+'-'+x_dv; 
                  ok_lectura = 1;
                }
              }

              if (ok_lectura == 1) {
                $scope.showload();
                //validarDrut($localStorage.app.sim, "16624648-2").then(function(resp){
                validarDrut($localStorage.app.sim, rutLeido).then(function(resp){
                  $scope.hideload();
                  var $xml = $( resp );
                  if ($xml.find('EL_RESPUESTA').text() == '001') { //error
                    $rootScope.err($xml.find('EL_MENSAJE').text());
                  }
                  else {
                    var res = [];
                    $scope.auxDrut = rutLeido;
                    $xml.find('TB_CONSULTADET>item').each(function(index) {
                      $scope.listaDrut.push({
                        material: $(this).find("material").text(),
                        monto: parseInt($(this).find("monto").text())
                      });
                      $rootScope.conveniodrut_fix = $(this).find("convenio").text();
                      $scope.limiteDrut = parseInt($(this).find("cantidad").text()); // cantidad es el limite de materiales a rebajar
                    });
                    // ordena listaDrut desde el mas caro.
                    $scope.listaDrut.sort(function(a,b) {return (a.monto < b.monto) ? 1 : ((b.monto < a.monto) ? -1 : 0);} ); 
                    $scope.isDrut = 1;

                    $rootScope.ok('Se aplicó descuento RUT a esta venta');
                    $scope.calcularTotales();
                    $scope.closeAddMedioPago();
                  }
                });
              }
              else {
                $rootScope.err("Solo debe leer cédula de identidad para aplicar descuento RUT");
              }
             
            }
          },
          function (error) {
              $rootScope.err("Cámara en uso");
          },{
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
     }

   }
   else if (reemplazaAuth == 1) { // bloqueo debe ser 1
    $rootScope.err('Descuento rut bloqueado en este pedido');
   }
  };

  $scope.addMpPromocionPedido = function() {
   $scope.auxList = []; //reset
   $scope.auxCodigo = "";
   $scope.auxMonto = 0;
   $scope.auxMaterial = "";
   $scope.auxIndex = 0;

   if ($scope.bloqueoPromocion == 0) {
       if (default_app.modo == "dev") {
        $scope.showload();
        var thepromo = prompt('INGRESE PROMO');
        validarPromocion($localStorage.app.sim, thepromo).then(function(resp){
          $scope.hideload();
          var $xml = $( resp );
          if ($xml.find('EL_RESPUESTA').text() == '001') { //error
            $rootScope.err($xml.find('EL_MENSAJE').text());
          }
          else if ($.inArray(thepromo,$scope.usadosPromocion) >= 0) {
            $rootScope.err('Código de promoción ya existe en este pedido');
          }
          else {
            var res = [];
            
            $xml.find('pagos>pago').each(function(index) {
              $scope.auxCodigo = $(this).find("DDV_CODIGO").text();
              $scope.auxMonto = ($(this).find("DDV_MONTO").text());
              var pr_materiales = ($(this).find("MA_CODIGO").text());
              var ar_materiales = pr_materiales.split(",");
              for (u = 0; u < mat.length; u++) {
                if ($.inArray(mat[u],ar_materiales) >= 0) {
                  var kilos = parseInt(mat[u].substring(3,5));
                  var compo = mat[u].substring(5,6);
                  
                  if (compo == "N") { compo = "NOR"; }
                  else if (compo == "C") { compo = "CAT"; }

                  $scope.auxList.push({compo: compo, kilos: kilos, codigo: mat[u]});  
                }
              }
            });

            $scope.closeAddMedioPago();
            $scope.openSeleccionMaterialPromocion();
          }
        });
       }
       else { 
       cordova.plugins.barcodeScanner.scan(
          function (result) {
            if (result.cancelled == 1) {
              $rootScope.err("No se ha leído ninguna promoción");
            }
            else {
              var ok_lectura = 0;
              if (result.text.length == 16) { 
                ok_lectura = 1;
              }

              if (ok_lectura == 1) {
                $scope.showload();
                validarPromocion($localStorage.app.sim, result.text).then(function(resp){
                  $scope.hideload();
                  var $xml = $( resp );
                  if ($xml.find('EL_RESPUESTA').text() == '001') { //error
                    $rootScope.err($xml.find('EL_MENSAJE').text());
                  }
                  else if ($.inArray(result.text,$scope.usadosPromocion) >= 0) {
                    $rootScope.err('Código de promoción ya existe en este pedido');
                  }
                  else {
                    var res = [];
                    
                    $xml.find('pagos>pago').each(function(index) {
                      $scope.auxCodigo = $(this).find("DDV_CODIGO").text();
                      $scope.auxMonto = ($(this).find("DDV_MONTO").text());
                      var pr_materiales = ($(this).find("MA_CODIGO").text());
                      var ar_materiales = pr_materiales.split(",");
                      for (u = 0; u < mat.length; u++) {
                        if ($.inArray(mat[u],ar_materiales) >= 0) {
                          var kilos = parseInt(mat[u].substring(3,5));
                          var compo = mat[u].substring(5,6);
                          
                          if (compo == "N") { compo = "NOR"; }
                          else if (compo == "C") { compo = "CAT"; }

                          $scope.auxList.push({compo: compo, kilos: kilos, codigo: mat[u]});  
                        }
                      }
                    });

                    $scope.closeAddMedioPago();
                    $scope.openSeleccionMaterialPromocion();
                  }
                });
              }
              else {
                $scope.hideload();
                $rootScope.err("El elemento leído no es una promoción");
              }
             
            }
          },
          function (error) {
              $rootScope.err("Cámara en uso");
          }, {
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
     }

   }
   else if (reemplazaAuth == 1) {
    $rootScope.err('Promociones bloqueadas para este pedido');
   }
  };

  $scope.AddPromocionOK = function() {
    var buscarMaterial = $scope.auxList[$scope.auxIndex].codigo;
    var promocionAplicada = 0;
    var materialExiste = 0;
    var materialIndex = 0;

    for(i=0; i < $scope.det.length; i++){ // leer todas las lineas de detalle 
      for (j=0; j<$scope.det[i].items.length;j++) { // leer lineas de material x item
        if (buscarMaterial == $scope.det[i].material) { // es el material de la listadrut
          if ($scope.det[i].items[j].isDrut == 0 && $scope.det[i].items[j].isCupon == 0 && $scope.det[i].items[j].isPromocion == 0) { // material sin nada
            $scope.det[i].items[j].isPromocion = 1;
            $scope.det[i].items[j].montoAplicado = $scope.auxMonto;
            $scope.det[i].items[j].codigoPromocion = $scope.auxCodigo;
            promocionAplicada = 1;
            $scope.isPromocion = 1;
            $scope.usadosPromocion.push($scope.auxCodigo);
            $scope.calcularTotales();
            $scope.closeSeleccionMaterialPromocion();
            $scope.auxList = []; //reset
            $scope.auxCodigo = "";
            $scope.auxMonto = 0;
            $scope.auxMaterial = "";
            $scope.auxIndex = 0;
          }
          materialExiste = 1;
          materialIndex = i;
        }
      }
    }

    if (promocionAplicada == 0 && materialExiste == 1) { // material nuevo
        mas = {
          isPromocion: 1,
          isDrut: 0,
          isCupon: 0,
          montoAplicado: $scope.auxMonto,
          codigoCupon: "",
          codigoPromocion: $scope.auxCodigo,
          codigoDrut: ""
        };
        $scope.det[materialIndex].items.push(mas);
        $scope.det[materialIndex].cantidad = parseInt($scope.det[materialIndex].cantidad) + 1;

        $scope.isPromocion = 1;
        $scope.usadosPromocion.push($scope.auxCodigo);
        $scope.calcularTotales();
        $scope.closeSeleccionMaterialPromocion();
        $scope.auxList = []; //reset
        $scope.auxCodigo = "";
        $scope.auxMonto = 0;
        $scope.auxMaterial = "";
        $scope.auxIndex = 0;
    }

    else if (promocionAplicada == 0) {
      /*var o = {
        numeroPedido: $scope.pedido.numeroPedido,
        pedidoOrigen: $scope.pedido.pedidoOrigen,
        material: buscarMaterial,
        cantidad: 1,
        valor: ($localStorage.app.priceList[buscarMaterial] ? $localStorage.app.priceList[buscarMaterial] : 0),
        items: [{
                  isPromocion: 1,
                  isDrut: 0,
                  isCupon: 0,
                  montoAplicado: $scope.auxMonto,
                  codigoCupon: "",
                  codigoPromocion: $scope.auxCodigo,
                  codigoDrut: ""
                }]
      };

      $scope.det.push(o);
      $scope.alertModificado = "(MODIFICADO)";
      */
      $rootScope.err('Material seleccionado no está contenido en el pedido');
      $scope.closeSeleccionMaterialPromocion();
    }    
  };

  $scope.addMpCuponPedido = function() {
   $scope.auxList = []; //reset
   $scope.auxCodigo = "";
   $scope.auxMonto = 0;
   $scope.auxMaterial = "";
   $scope.auxIndex = 0;
   
   if ($scope.bloqueoCupon == 0) {
       if (default_app.modo == "dev") {
        $scope.showload();
        var thecupon = prompt('INGRESE Cupon');
        validarCupon($localStorage.app.sim, thecupon).then(function(resp){
          $scope.hideload();
          var $xml = $( resp );
          if ($xml.find('EL_RESPUESTA').text() == '001') { //error
            $rootScope.err($xml.find('EL_MENSAJE').text());
          }
          else if ($xml.find('EL_RESPUESTA').text() != "000") { //error
            $rootScope.err('Código de cupón incorrecto');
          }
          else if ($.inArray(thecupon,$scope.usadosCupon) >= 0) {
            $rootScope.err('Código de cupón ya existe en este pedido');
          }
          else {
            var buscarMaterial = ($xml.find("pagos>pago").find("MA_CODIGO").text());
            var cuponAplicado = 0;
            var materialExiste = 0;
            var materialIndex = 0;

            for(i=0; i < $scope.det.length; i++){ // leer todas las lineas de detalle 
              for (j=0; j<$scope.det[i].items.length;j++) { // leer lineas de material x item
                if (buscarMaterial == $scope.det[i].material) { // es el material de la listadrut
                  if ($scope.det[i].items[j].isDrut == 0 && $scope.det[i].items[j].isPromocion == 0 && $scope.det[i].items[j].isCupon == 0) { // no tiene promocion ni drut
                    $scope.det[i].items[j].isCupon = 1;
                    $scope.det[i].items[j].montoAplicado = $scope.det[i].valor;
                    $scope.det[i].items[j].codigoCupon = thecupon;
                    cuponAplicado = 1;
                  }
                  materialExiste = 1;
                  materialIndex = i;
                }
              }
            }

            if (cuponAplicado == 0 && materialExiste == 1) { // material existe
              var o = {
                        isPromocion: 0,
                        isDrut: 0,
                        isCupon: 1,
                        montoAplicado: ($localStorage.app.priceList[buscarMaterial] ? $localStorage.app.priceList[buscarMaterial] : 0),
                        codigoCupon: thecupon,
                        codigoPromocion: "",
                        codigoDrut: ""
              };
              $scope.det[materialIndex].items.push(o);
              $scope.det[materialIndex].cantidad = parseInt($scope.det[materialIndex].cantidad) + 1;
              $scope.alertModificado = "(MODIFICADO)";
            }
            else if (cuponAplicado == 0) { // material nuevo
              var o = {
                numeroPedido: $scope.pedido.numeroPedido,
                pedidoOrigen: $scope.pedido.pedidoOrigen,
                material: buscarMaterial,
                cantidad: 1,
                valor: ($localStorage.app.priceList[buscarMaterial] ? $localStorage.app.priceList[buscarMaterial] : 0),
                items: [{
                          isPromocion: 0,
                          isDrut: 0,
                          isCupon: 1,
                          montoAplicado: ($localStorage.app.priceList[buscarMaterial] ? $localStorage.app.priceList[buscarMaterial] : 0),
                          codigoCupon: thecupon,
                          codigoPromocion: "",
                          codigoDrut: ""
                        }]
              }
              $scope.det.push(o);
              $scope.alertModificado = "(MODIFICADO)";
            }

            $scope.isCupon = 1;
            $scope.usadosCupon.push($scope.auxCodigo);
            $scope.calcularTotales();

            $rootScope.ok('Cupón ingresado con éxito');
            $scope.closeAddMedioPago();
          }
        });
       }
       else { 
       cordova.plugins.barcodeScanner.scan(
          function (result) {
            if (result.cancelled == 1) {
              $rootScope.err("No se ha leído ningun cupón");
            }
            else {
              var ok_lectura = 0;
              if (result.text.length == 10 || result.text.length == 9 || result.text.length == 8) { 
                ok_lectura = 1;
              }

              if (ok_lectura == 1) {
                $scope.showload();
                validarCupon($localStorage.app.sim, result.text).then(function(resp){
                  $scope.hideload();
                  var $xml = $( resp );
                  if ($xml.find('EL_RESPUESTA').text() == '001') { //error
                    $rootScope.err($xml.find('EL_MENSAJE').text());
                  }
                  else if ($.inArray(result.text,$scope.usadosCupon) >= 0) {
                    $rootScope.err('Código de cupon ya existe en este pedido');
                  }
                  else {
                    var buscarMaterial = ($xml.find("pagos>pago").find("MA_CODIGO").text());
                    var cuponAplicado = 0;
                    var materialExiste = 0;
                    var materialIndex = 0;
                    var cuponMake = 0;

                    for(i=0; i < $scope.det.length; i++){ // leer todas las lineas de detalle 
                      for (j=0; j<$scope.det[i].items.length;j++) { // leer lineas de material x item
                        if (buscarMaterial == $scope.det[i].material) { // es el material de la listadrut
                          if ($scope.det[i].items[j].isDrut == 0 && $scope.det[i].items[j].isPromocion == 0 && $scope.det[i].items[j].isCupon == 0) { // no tiene promocion ni drut
                            $scope.det[i].items[j].isCupon = 1;
                            $scope.det[i].items[j].montoAplicado = $scope.det[i].valor;
                            $scope.det[i].items[j].codigoCupon = result.text;
                            cuponAplicado = 1;
                            $scope.isCupon = 1;
                            $scope.usadosCupon.push($scope.auxCodigo);
                            $scope.calcularTotales();
                            
                            $rootScope.ok('Cupón ingresado con éxito');
                          }
                          materialExiste = 1;
                          materialIndex = i;
                        }
                      }
                    }

                    if (cuponAplicado == 0 && materialExiste == 1) { // material existe
                      var o = {
                                isPromocion: 0,
                                isDrut: 0,
                                isCupon: 1,
                                montoAplicado: ($localStorage.app.priceList[buscarMaterial] ? $localStorage.app.priceList[buscarMaterial] : 0),
                                codigoCupon: thecupon,
                                codigoPromocion: "",
                                codigoDrut: ""
                      };
                      $scope.det[materialIndex].items.push(o);
                      $scope.det[materialIndex].cantidad = parseInt($scope.det[materialIndex].cantidad) + 1;
                      $scope.alertModificado = "(MODIFICADO)";

                      $scope.isCupon = 1;
                      $scope.usadosCupon.push($scope.auxCodigo);
                      $scope.calcularTotales();
                      
                      $rootScope.ok('Cupón ingresado con éxito');
                    }

                    else if (cuponAplicado == 0) { // material nuevo
                      /*
                      var o = {
                        numeroPedido: $scope.pedido.numeroPedido,
                        pedidoOrigen: $scope.pedido.pedidoOrigen,
                        material: buscarMaterial,
                        cantidad: 1,
                        valor: ($localStorage.app.priceList[buscarMaterial] ? $localStorage.app.priceList[buscarMaterial] : 0),
                        items: [{
                                  isPromocion: 0,
                                  isDrut: 0,
                                  isCupon: 1,
                                  montoAplicado: ($localStorage.app.priceList[buscarMaterial] ? $localStorage.app.priceList[buscarMaterial] : 0),
                                  codigoCupon: result.text,
                                  codigoPromocion: "",
                                  codigoDrut: ""
                                }]
                      }
                      $scope.alertModificado = "(MODIFICADO)";
                      $scope.det.push(o);

                      $scope.isCupon = 1;
                      $scope.usadosCupon.push($scope.auxCodigo);
                      $scope.calcularTotales();
                      */
                      $rootScope.err('Material no está contenido en el pedido');
                      
                    }

                    $scope.closeAddMedioPago();
                  }
                });
              }
              else {
                $rootScope.err("El elemento leído no es un cupón");
              }
             
            }
          },
          function (error) {
              $rootScope.err("Cámara en uso");
          },{
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
     }

   }
   else if (reemplazaAuth == 1) {
    $rootScope.err('Promociones bloqueadas para este pedido');
   }
  };

  $scope.$on('modal.hidden', function(e) {
    $interval.cancel(MyMarkerTimer); 
    //$scope.verMapaFullModal.remove();
  });

  $scope.takePicture = function() {
    navigator.camera.getPicture(function(imageURI) {
     $(".vistapreviafoto").attr('src', 'data:image/jpeg;base64,'+imageURI);
     $scope.imageurl = 'data:image/jpeg;base64,'+imageURI;
    }, function() { 
     $rootScope.err("No se ha cargado una imagen"); }, {
      quality: 50,
      allowEdit: false,
      destinationType: Camera.DestinationType.DATA_URL,
      targetWidth: 400,
      targetWidth: 400,
      correctOrientation: true,
      saveToPhotoAlbum: true
    });
  };

});
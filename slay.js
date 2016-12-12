function random(min, max) {
  var rand = min + Math.random() * (max - min)
  rand = Math.round(rand);
  return rand;
}

/*
  Модель вектора
*/
new Model('Vector',{
  ident : {
    type : 'string',
    iskey : true
  }
})
new Model('Color',{
  ident : {
    type : 'string',
    iskey : true
  }
})
new Model('User',{
  ident : {
    type : 'string',
    iskey : true
  },
  color : {
    type : 'string',
    getter : function( ident ){
      return new Color({ ident : ident })
    }
  }
})
new Model('Minimap',{
  id : {
    type : 'int',
    iskey : true
  },
  user : {
    type : 'string',
    getter : function( ident ){
      return new User({ ident : ident })
    },
    field : 'ident'
  },
  gold : {
    type : 'int',
    def : 10
  }
})
/*
 Модель полигона
*/
new Model('Poly',{
  x : {
    type : 'int',
    iskey : true
  },
  y : {
    type : 'int',
    iskey : true
  },
  user : {
    type : 'string',
    getter : function( ident ){
      return new User({ ident : ident })
    },
    field : 'ident'
  },
  free_vectors : {
    type : 'array',
    init : function(){
      return Vector.all()
    }
  },
  minimap : {
    type : 'int',
    getter : function( id ){
      return new Minimap({ id : id });
    },
    field : 'id',
    def : 0
  },
  is_active : {
    type : 'bool',
    def : false
  },
  waiting : {
    type : 'string',
    getter : function( ident ){
      return new Unit({ ident : ident })
    },
    field : 'ident'
  },
  moved : {
    type : 'string',
    getter : function( ident ){
      return new Unit({ ident : ident })
    },
    field : 'ident'
  },
  is_house : {
    type : 'bool',
    def : false
  },
  unit : {
    type : 'string',
    getter : function( ident ){
      return new Unit({ ident : ident })
    },
    field : 'ident'
  },
  is_click : {
    type : 'bool',
    def : false
  }
})
/*
  Юниты
*/
new Model('Unit',{
  ident : {
    type : 'string',
    iskey : true,
    isfrooze : true
  },
  price : {
    type : 'int',
    isfrooze : true
  },
  cach : {
    type : 'int',
    isfrooze : true
  }
})
new Model('SelectUnit',{
  unit : {
    type : 'string',
    getter : function( ident ){
      return new Unit({ ident : ident })
    },
    iskey : true
  }
})

User.random = function(){
  var user_all = User.all()
  var rand = random( 0 , user_all.length - 1 )
  return user_all[ rand ]
}
/*
  Получение рандомного полигона у которого есть свободные векторы для генерации полигонов вокруг
*/
Poly.randomFreeVectors = function(){
  var Poly_filter = Poly.FreeVectors();
  if( !Poly_filter.length ) return false;
  return Poly_filter[ random( 0 , Poly_filter.length - 1 ) ]
}
/*
  Получение всех полигонов у которых есть свободные векторы для генерации полигонов вокруг
*/
Poly.FreeVectors = function(){
  return Poly.all().filter(function( _poly ){
    return _poly.free_vectors.length  >3
  })
}
/*
 Получение рандомного вектора у полигона
*/
Poly.prototype.SpliceRandomVector = function(){
  var free_vectors = this.free_vectors;
  return free_vectors.splice( random( 0 , free_vectors.length - 1 ) , 1 ).shift()
}
/*
  Выделение полигонов по радиусу
*/
Poly.prototype.activeByRad = function(){
  Poly.all().map(function(_poly){
    if(
      Math.abs( _poly.x - this.x ) <= 50 && Math.abs( _poly.y - this.y ) <= 50 &&
      // Если есть хотя бы один смежный полигон с этой миникартой
      Vector.all().some(function( _v ){
        var pos = mathPosPoly( _v , _poly );
        var poly_f = Poly.find({ x : pos[0] , y : pos[1] })
        if( poly_f.length ){
          return poly_f.shift().minimap.id == this.minimap.id
        }
        return false;
      },this)
      
    ){
      if( this.unit.ident ){
        if( _poly.uniq_key != this.uniq_key ){
          _poly.waiting = this.unit.ident;
        }
      }
      _poly.is_active = true;
    }
  },this)
}
/*
  Поиск активных эдементов
*/
Poly.issetActive = function(){
  return Poly.all().filter(function( _poly ){
    return _poly.is_active;
  })
}
Poly.unsetWaiting = function(){
  Poly.all().map(function( _poly ){
    _poly.waiting = ""
  })
}


/*
  Подсчет позиции относительно полигона по вектору
*/
function mathPosPoly( v , p ){
  var x,y;
  var left  = p.x
  var top   = p.y
  var d = 16
  var s = 26
  var f = 32
  switch( v.ident ){  
    case "ab":
      x = left + d
      y = top - s
    break;
    case "bc":
      x = left + f
      y = top
    break;
    case "cd":
      x = left + d
      y = top + s
    break;
    case "de":
      x = left - d
      y = top + s
    break;
    case "ef":
      x = left - f
      y = top
    break;
    case "fa":
      x = left - d
      y = top - s
    break;
  }
  return [ Math.ceil( x ) , Math.ceil( y ) ]
}
/*
  Рисование полигонов
*/
function RenderPoly(){
  Poly.all().map(function(_poly){
    var div = new Join({
      view : 'poly_div',
      object : _poly,
      controller : 'poly'
    })

    $('#map').append(
      $(div)
    )
    
  })
}
/*
  Функция генерирования полигонов
*/
function GeneratePolygones(){

  // Сгенерировали достаточно полигонов
  if( Poly.all().length >= 100 ) return false;

  // Получили рандомный
  var rand_poly = Poly.randomFreeVectors();

  // Закончились полигоны вокруг которых можно генерировать
  if( !rand_poly ) return false;

  // Получаем вестор
  var vector = rand_poly.SpliceRandomVector()

  var pos = mathPosPoly( vector , rand_poly );

  if( pos[0] <= 20 || pos[1] <= 20 ){
    return GeneratePolygones();
  }

  var findPolys = Poly.find({ x : pos[0] , y : pos[1] });

  // Такой полигон уже есть
  if( findPolys.length ){
    return GeneratePolygones();
  }

  new Poly({ x : pos[0] , y : pos[1] , user : User.random().ident });

  return GeneratePolygones();
}
/*
  Раскраска полигонов
*/
Poly.all().map(function(_poly){
  _poly.user = User.random().ident
})
/*
  Распределение полигонов по пользователям
*/
function AllPolyForUser(){
  Poly.all().map(function( _poly ){
    _poly.user = User.random().ident
  })
}
/*
  Распраделение домов
*/
function MinimapCreateHouse(){
  
}
/*
  Объединение полигонов в миникарты
*/
function CreateMinimaps(){
  Poly.all().map(function( _poly ){
    
    var minimaps = [];
    
    Vector.all().map(function( _vector ){
      var pos = mathPosPoly( _vector , _poly )
      var find_poly = Poly.find({ x : pos[0] , y : pos[1] })
      if( !find_poly.length ) return false;
      
      find_poly = find_poly.shift()
      
      if( find_poly.minimap.id && find_poly.user.color.ident == _poly.user.color.ident ){
        minimaps.push( find_poly.minimap.id )
      }
      
    })
    
    if( !minimaps.length ){
      var minimap = new Minimap({ id : (Minimap.all().length + 1) , user : _poly.user.ident })
      _poly.minimap = minimap.id
    }else{
      _poly.minimap = minimaps.shift()
      minimaps.map(function( _minimap ){
        Poly.find({ minimap : _minimap }).map(function( __poly ){
          __poly.minimap = _poly.minimap.id;
        })
      })
    }
    
  })
}
/*
  Создание домов
*/
function CreateHouses(){
  Minimap.all().map(function( _minimap ){
    if( _minimap.user.color.ident != 'green' ) return false;
    var polys = Poly.find({ minimap : _minimap.id })
    if( polys.length < 2 ) return false;
    
    var rand_poly = polys[ random( 0 , polys.length - 1 ) ]
    rand_poly.is_house = true
    
  })
}
function Poly_null_waiting( node ){
  if( typeof $(node).attr('class') != 'undefined' ){
    classes = $(node).attr('class')
    classes.split(/\s+/).map(function( _class ){
      if( _class.match(/^w_u([0-9])$/) ){
        $(this).removeClass(_class)
      }
    },node)
  }
}
/*
  Удаляем с ноды всех юнитов
*/
function Poly_null_unit( node ){
  if( typeof $(node).attr('class') != 'undefined' ){
    classes = $(node).attr('class')
    classes.split(/\s+/).map(function( _class ){
      if( _class.match(/^u([0-9])$/) ){
        $(this).removeClass(_class)
      }
    },node)
  }
}
/*
  Сброс пользователей
*/
function Poly_null_user( node ){
  if( typeof $(node).attr('class') != 'undefined' ){
    classes = $(node).attr('class')
    classes.split(/\s+/).map(function( _class ){
      User.all().map(function( _user ){
        if( _user.color.ident == _class ){
          $(node).removeClass(_class)
        }
      },this)
    },node)
  }  
}



new View({
  ident : 'poly_div',
  render : function( _poly ){
    return $('<div/>').addClass('polygon').css({
      left : _poly.x,
      top : _poly.y
    }).addClass( _poly.user.color.ident )
  }
})

new Controller({
  ident : 'poly',
  events : {
    click : function( ){
      
      if( this.is_active ){
        
        // Деактивируем все полигоны
        Poly.all().map(function(_poly){
          _poly.is_active = false;
        })
        $('.back').hide()
        $('#menu').hide()
        
        // Если на полигон на который кликнули нет дома но ожидает юнита
        // то ставим юнита
        if( !this.is_house && this.waiting.ident ){
          this.unit = this.waiting.ident
          
          // Ищем полигон с которого все начиналось
          // Если не совпадают миникарты то приравниваем миникарты
          var poly_click = Poly.all().filter(function(_poly){
            return _poly.is_click
          })
          if( poly_click.length ){
            poly_click = poly_click.shift()
            if( poly_click.minimap.id != this.minimap.id ){
              this.minimap = poly_click.minimap.id;
            }
          }
          // Если там был юнит то его надо перенести
        }
        // Убираем все полигоны с ожидания
        Poly.unsetWaiting();
      }else{
        
        // Можно кликнуть только на свое поле
        if( this.minimap.user.color.ident != 'green' ) return false;
        this.activeByRad()
        $('.back').show()
        $('#menu').show()
        
        console.log( this.minimap.gold )
        
      }
      
      // Переопределяем полигон клика
      Poly.all().map(function(_obj){
        if( this.uniq_key != _obj.uniq_key ) _obj.is_click = false;
      },this)
      this.is_click = true;
    }
  },
  listen : {
    // Поменяли пользователя
    user : function( obj ){
      Poly_null_user( $(this) )
      $(this).addClass( obj.user.color.ident )
    },
    waiting : function( obj ){
      if( obj.waiting.ident == "" ){
        Poly_null_waiting( $(this) )
        return true;
      }
      // Если есть дом то нельзя поставить юнита
      if( obj.is_house ){
        return false;
      }
      if( obj.waiting.ident ){
        $(this).addClass('w_u' + obj.waiting.ident.replace(/^warrior\ ([0-9])$/, function(_,c){return c;}))
      }
    },
    minimap : function( obj ){
      Poly_null_user( $(this) )
      obj.user = obj.minimap.user.ident
      $( this ).addClass( obj.minimap.user.color.ident )
    }, 
    unit : function( obj ){
      if( !obj.unit.ident ){
        Poly_null_unit( this )
        return false;
      }
      Poly.find({is_click : true}).shift().unit = undefined;
      $(this).addClass('u' + obj.waiting.ident.replace(/^warrior\ ([0-9])$/, function(_,c){return c;}))
      Poly.unsetWaiting()
    },
    is_active : function( obj ){
      if( obj.is_active ){
        $(this).css({ 'z-index' : 4 })
      }else{
        $(this).css({ 'z-index' : 0 })
      }
    },
    is_house : function( obj ){
      if( obj.is_house ){
        $(this).addClass('h')
      }else{
        $(this).removeClass('h')
      }
    }
  }
})
new Controller({
  ident : 'select_unit',
  events : {
    click : function(){
      var ident = this.unit.ident.replace(/^warrior\ ([0-9])$/,function( _ , id ){
        if( Number(id) == 4 ) id = 0
        id = Number(id) + 1
        return 'warrior ' + id
      })
      this.unit = ident
    }
  },
  listen : {
    unit : function( obj ){
      var classes = []
      Poly_null_waiting( $(this) )
      $(this).addClass('u' + obj.unit.ident.replace(/^warrior\ ([0-9])$/,function( _ , id ){
        return id
      }))
    }
  }
})
new Controller({
  ident : 'sale_unit',
  events : {
    click : function(){
      var self = this
      Poly.all().map(function( _poly ){
        if( _poly.is_active ){
          _poly.waiting = self.unit.ident
        }
        if( _poly.is_click ){
          if( _poly.minimap.gold - self.unit.price >= 0 ){
            _poly.minimap.gold = _poly.minimap.gold - self.unit.price;
          }else{
            alert("Не хватает денег")
          }
        }
      })
    }
  },
  listen : {}
})


var vectors = ["ab","bc","cd","de","ef","fa"];
vectors.map(function(_ident){
  new Vector({ ident : _ident })
})

var colors = ["red","yellow","blue","green"];
colors.map(function(_color){
  new Color({ ident : _color })
})

var users = ["Игрок 1","Игрок 2","Игрок 3","Игрок 4"];
users.map(function( _user , i ){
  new User({ ident : _user , color : colors[i] })
})

new Poly({ x : 250 , y : 250 , user : User.random().ident });

new Unit({ ident : "warrior 1" , price : 10 , cach : 0 })
new Unit({ ident : "warrior 2" , price : 20 , cach : 3 })
new Unit({ ident : "warrior 3" , price : 30 , cach : 10 })
new Unit({ ident : "warrior 4" , price : 40 , cach : 20 })

/* Создание полигонов */
GeneratePolygones();

/* рисуем полигоны */
RenderPoly();

/* Создаем миникарты */
CreateMinimaps()

/* Создаем на миникартах дома */
MinimapCreateHouse()

CreateHouses()

var SelectUnit = new SelectUnit({ unit : 'warrior 1' })

$(document).ready(function(){
  new Join({
    object : SelectUnit,
    node : $('#select_unit'),
    controller : 'select_unit'
  })
  
  new Join({
    node : $('#sale_unit'),
    object : SelectUnit,
    controller : 'sale_unit'
  })

  $('body').on('click','.back' ,function(){
    Poly.all().map(function(_poly){
      _poly.is_active = false;
    })
    $('.back').hide()
    $('#menu').hide()
  })
  
  $('#end').click(function(){
    // Новый ход
    Poly.all().map(function(_poly){
      _poly.minimap.gold++
      if( _poly.unit.ident ){
        _poly.minimap.gold = _poly.minimap.gold - _poly.unit.cach
      }
    })
  })

})


const fs = require('fs')
const path = require('path')
const Product = require('../models/product')
const Order = require('../models/order')
const PDFDocument = require('pdfkit')

exports.getProducts = (request, response, next) => {
  Product.find()
  .then(products => {
    response.render('shop/product-list', { 
      prods: products, 
      pageTitle: 'All Products', 
      path: '/products'
    })
  })
  .catch(err => {
    // response.redirect('/500')
    const error = new Error(err)
    error.httpStatusCode = 500
    // express will skip all middleware and go straight to error middleware 
    // if next() has an error argument
    return next(error)
  })
}

exports.getProduct = (request, response, next) => {
  const prodId = request.params.productId
  Product.findById(prodId)
  .then(product => {
    response.render('shop/product-detail', { 
      product: product, 
      pageTitle: product.title, 
      path: '/products'
    })
  })
  .catch(err => {
    // response.redirect('/500')
    const error = new Error(err)
    error.httpStatusCode = 500
    // express will skip all middleware and go straight to error middleware 
    // if next() has an error argument
    return next(error)
  })
}

exports.getIndex = (request, response, next) => {
  Product.find()
  .then(products => {
    response.render('shop/index', { 
      prods: products, 
      pageTitle: 'Shop', 
      path: '/',
    })
  })
  .catch(err => {
    // response.redirect('/500')
    const error = new Error(err)
    error.httpStatusCode = 500
    // express will skip all middleware and go straight to error middleware 
    // if next() has an error argument
    return next(error)
  })
}

exports.getCart = (request, response, next) => {
  request.user.populate('cart.items.productId').execPopulate()
  .then(user => {
    const products = user.cart.items
    response.render('shop/cart', {
      path: '/cart',
      pageTitle: "Your Cart",
      products: products
    })
  })
  .catch(err => {
    // response.redirect('/500')
    const error = new Error(err)
    error.httpStatusCode = 500
    // express will skip all middleware and go straight to error middleware 
    // if next() has an error argument
    return next(error)
  })
  
}

exports.postCart = (request, response, next) => {
  const prodId = request.body.productId
  Product.findById(prodId)
  .then(product => {
    return request.user.addToCart(product)
  })
  .then(result => {
    console.log(result)
    response.redirect('/cart')
  })
  .catch(err => {
    // response.redirect('/500')
    const error = new Error(err)
    error.httpStatusCode = 500
    // express will skip all middleware and go straight to error middleware 
    // if next() has an error argument
    return next(error)
  })
  // let fetchedCart
  // let newQuantitty = 1
  // request.user.getCart()
  // .then(cart => {
  //   fetchedCart = cart
  //   return cart.getProducts({ where: { id: prodId }})
  // })
  // // updates quantity of product in cart if product already exists in cart
  // .then(products => {
  //   let product
  //   if (products.length > 0) {
  //     product = products[0]
  //   }
    
  //   if (product) {
  //     const oldQuantity = product.cartItem.quantity
  //     newQuantitty = oldQuantity + 1
  //     return product
  //   }
  //   return Product.findByPk(prodId)
  // })
  // // adds a new product to cart 
  // .then(product => {
  //   return fetchedCart.addProduct(product, 
  //     { through: { quantity: newQuantitty } })
  // })
  // .catch(error => console.log(error))
  // .then(() => {
  //   response.redirect('/cart')
  // })
  // .catch(error => console.log(error))
}

exports.postCartDeleteProduct = (request, response, next) => {
  const prodId = request.body.productId
  request.user.removeFromCart(prodId)
  .then(result => {
    response.redirect('/cart')
  })
  .catch(err => {
    // response.redirect('/500')
    const error = new Error(err)
    error.httpStatusCode = 500
    // express will skip all middleware and go straight to error middleware 
    // if next() has an error argument
    return next(error)
  })
}

// removed getCheckout()

exports.postOrder = (request, response, next) => {
  request.user.populate('cart.items.productId').execPopulate()
  .then(user => {
    const products = user.cart.items.map(i => {
      // mongoose provides _doc to grab all the meta data from an object
      return {quantity: i.quantity, product: { ...i.productId._doc }}
    })
    const order = new Order({
      user: {
        email: request.user.email,
        userId: request.user
      },
      products: products
    })
    return order.save()
  })
  .then(result => {
    return request.user.clearCart()
  })
  .then(result => {
    response.redirect('/orders')
  })
  .catch(err => {
    // response.redirect('/500')
    const error = new Error(err)
    error.httpStatusCode = 500
    // express will skip all middleware and go straight to error middleware 
    // if next() has an error argument
    return next(error)
  })
}

exports.getOrders = (request, response, next) => {
  Order.find({ 'user.userId': request.user._id })
  .then(orders => {
    response.render('shop/orders', {
      path: '/orders',
      pageTitle: 'Your Orders',
      orders: orders
    })
  })
  .catch(err => {
    // response.redirect('/500')
    const error = new Error(err)
    error.httpStatusCode = 500
    // express will skip all middleware and go straight to error middleware 
    // if next() has an error argument
    return next(error)
  })
}

exports.getInvoice = (request, response, next) => {
  const orderId = request.params.orderId
  Order.findById(orderId).then(order => {
    if (!order) {
      return next(new Error('No order found.'))
    }
    if (order.user.userId.toString() !== request.user._id.toString()) {
      return next(new Error('Unauthorized'))
    }
  const invoiceName = 'invoice-' + orderId + '.pdf'
  const invoicePath = path.join('data', 'invoices', invoiceName)

  const pdfDoc = new PDFDocument()
  response.setHeader('Content-Type', 'application/pdf')
  response.setHeader('Content-Dsiposition', 'inline; filename="' + invoiceName + '"')
  pdfDoc.pipe(fs.createWriteStream(invoicePath))
  pdfDoc.pipe(response)

  pdfDoc.text('Hello world!')

  pdfDoc.end()
  // fs.readFile(invoicePath, (err, data) => {
  //   if (err) {
  //     return next(err)
  //   }
  //   response.setHeader('Content-Type', 'application/pdf')
  //   response.setHeader('Content-Dsiposition', 'inline; filename="' + invoiceName + '"')
  //   response.send(data)
  // })
  // const file = fs.createReadStream(invoicePath)

  // file.pipe(response)
  }).catch(err => next(err))
}
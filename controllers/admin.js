const Product = require('../models/product')
const { validationResult } = require('express-validator/check')

exports.getAddProduct = (request, response, next) => {
    response.render('admin/edit-product', { 
      pageTitle: "Add Product", 
      path: '/admin/add-product',
      hasError: false,
      editing: false,
      errorMessage: null,
      validationErrors: []
    })
  }

  exports.postAddProduct = (request, response, next) => {
    const title = request.body.title
    const imageUrl = request.body.imageUrl
    const price = request.body.price
    const description = request.body.description
    const errors = validationResult(request)

    if (!errors.isEmpty()) {
      return response.status(422).render('admin/edit-product', { 
        pageTitle: "Add Product", 
        path: '/admin/add-product',
        editing: false,
        hasError: true, 
        product: {
          title: title,
          imageUrl: imageUrl,
          price: price,
          description: description
        },
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array()
        })
    }

    const product = new Product({ 
      title: title,
      price: price,
      description: description,
      imageUrl: imageUrl,
      userId: request.user
    })
    // save method is coming from mongoose 
    // it does not need to be created
    // mongoose is an Object Relational Document framework just as ActiveRecord
    product.save()
    .then(result => {
      response.redirect('/admin/products')
    })
    .catch(err => {
      // response.redirect('/500')
      const error = new Error(err)
      error.httpStatusCode = 500
      // express will skip all middleware and go straight to error middleware 
      // if next() has an error argument
      // next has to be used in order to send the error to the error middleware
      return next(error)
    })
  }

  exports.getEditProduct = (request, response, next) => {
    const editMode = request.query.edit
    if(!editMode) {
      return response.redirect('/')
    }
    const prodId = request.params.productId
    Product.findById(prodId)
    .then(product => {
      if(!product) {
        return response.redirect('/')
      }
      response.render('admin/edit-product', { 
        pageTitle: "Edit Product", 
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
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

  exports.postEditProduct = (request, response, next) => {
    const prodId = request.body.productId
    const updatedTitle = request.body.title
    const updatedPrice = request.body.price
    const updatedDesc = request.body.description
    const updatedImgUrl = request.body.imageUrl
    const errors = validationResult(request)

    if (!errors.isEmpty()) {
      return response.status(422).render('admin/edit-product', { 
        pageTitle: "Edit Product", 
        path: '/admin/edit-product',
        editing: true,
        hasError: true, 
        product: {
          title: updatedTitle,
          imageUrl: updatedImgUrl,
          price: updatedPrice,
          description: updatedDesc,
          _id: prodId
        },
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array()
        })
    }

    Product.findById(prodId)
    .then(product => {
      if (product.userId.toString() !== request.user._id.toString()) {
        return response.redirect('/')
      }
      product.title = updatedTitle
      product.description = updatedDesc
      product.price = updatedPrice
      product.imageUrl = updatedImgUrl
      return product.save()
      .then(result => {
        console.log('UPDATED PRODUCT', result)
        response.redirect('/admin/products')
  
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

  exports.getProducts = (request, response, next) => {
    // one layer of validation
    // only render products for admin product view that matches current user id
    Product.find({userId: request.user._id})
    .populate('userId')
      .then(products => {
        response.render('admin/products', { 
          prods: products, 
          pageTitle: 'Admin Products', 
          path: '/admin/products', 
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

  exports.postDeleteProduct = (request, response, next) => {
    const prodId = request.body.productId
    // find product where the product id matches and where the user id matches
    Product.deleteOne({ _id: prodId, userId: request.user._id })
    .then(result => {
      response.redirect('/admin/products')
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
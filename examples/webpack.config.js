var path = require("path");
module.exports = {
  entry: './index.js',
  module: {
    loaders: [
      {
        include: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, "build"),
    publicPath: "/assets/",
    filename: "bundle.js"
  }
};

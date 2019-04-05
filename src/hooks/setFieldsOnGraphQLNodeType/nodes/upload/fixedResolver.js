const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
} = require('gatsby/graphql');

const ImgixParamsType = require('./ImgixParamsType');
const isImage = require('./utils/isImage');
const createUrl = require('./utils/createUrl');
const getSizeAfterTransformations = require('./utils/getSizeAfterTransformations');
const getBase64 = require('./utils/getBase64');
const getTracedSVG = require('./utils/getTracedSVG');
const objectAssign = require('object-assign');

const args = {
  width: {
    type: GraphQLInt,
    defaultValue: 400,
  },
  height: {
    type: GraphQLInt,
  },
  imgixParams: {
    type: ImgixParamsType,
  },
};

module.exports = cacheDir => ({
  type: new GraphQLObjectType({
    name: `DatoCmsFixed`,
    fields: {
      base64: {
        type: GraphQLString,
        resolve: (image, args, context) => getBase64(image, cacheDir),
      },
      tracedSVG: {
        type: GraphQLString,
        resolve: (image, args, context) => getTracedSVG(image, cacheDir),
      },
      aspectRatio: { type: GraphQLFloat },
      width: { type: GraphQLFloat },
      height: { type: GraphQLFloat },
      src: { type: GraphQLString },
      srcSet: { type: GraphQLString },
    },
  }),
  args,
  resolve: (image, { width, height, imgixParams = {} }, context) => {
    if (!isImage(image)) {
      return null;
    }

    const mergedImgixParams = objectAssign(
      {},
      imgixParams,
      { w: width },
      height && { h: height },
    );

    context.imgixParams = mergedImgixParams;
    context.image = image;

    const { width: finalWidth, height: finalHeight } = getSizeAfterTransformations(
      image.width,
      image.height,
      mergedImgixParams
    );

    const aspectRatio = finalWidth / finalHeight;

    const srcSet = [1, 1.5, 2, 3].map((dpr) => {
      let extraParams = { dpr };
      if (!mergedImgixParams.w && !mergedImgixParams.h) {
        extraParams.w = finalWidth;
      }
      const url = createUrl(image, mergedImgixParams, extraParams);

      return `${url} ${dpr}x`;
    }).join(`,\n`);

    return {
      aspectRatio,
      width: finalWidth,
      height: finalHeight,
      format: image.format,
      src: createUrl(image, mergedImgixParams),
      srcSet,
    };
  },
});

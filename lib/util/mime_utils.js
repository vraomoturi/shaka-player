/*! @license
 * Shaka Player
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

goog.provide('shaka.util.MimeUtils');

goog.require('shaka.dependencies');
goog.require('shaka.media.Transmuxer');

/**
 * @summary A set of utility functions for dealing with MIME types.
 * @export
 */
shaka.util.MimeUtils = class {
  /**
   * Takes a MIME type and optional codecs string and produces the full MIME
   * type.
   *
   * @param {string} mimeType
   * @param {string=} codecs
   * @return {string}
   * @export
   */
  static getFullType(mimeType, codecs) {
    let fullMimeType = mimeType;
    if (codecs) {
      fullMimeType += '; codecs="' + codecs + '"';
    }
    return fullMimeType;
  }

  /**
   * Takes a MIME type and a codecs string and produces the full MIME
   * type. If it's a transport stream, convert its codecs to MP4 codecs.
   *
   * @param {string} mimeType
   * @param {string} codecs
   * @param {string} contentType
   * @return {string}
   */
  static getFullOrConvertedType(mimeType, codecs, contentType) {
    const fullMimeType = shaka.util.MimeUtils.getFullType(mimeType, codecs);

    if (!shaka.dependencies.muxjs() ||
        !shaka.media.Transmuxer.isTsContainer(fullMimeType)) {
      return fullMimeType;
    }

    return shaka.media.Transmuxer.convertTsCodecs(contentType, fullMimeType);
  }


  /**
   * Takes a Stream object and produces an extended MIME type with information
   * beyond the container and codec type, when available.
   *
   * @param {shaka.extern.Stream} stream
   * @return {string}
   */
  static getExtendedType(stream) {
    const components = [stream.mimeType];

    const extendedMimeParams = shaka.util.MimeUtils.EXTENDED_MIME_PARAMETERS_;
    extendedMimeParams.forEach((mimeKey, streamKey) => {
      const value = stream[streamKey];
      if (value) {
        components.push(mimeKey + '="' + value + '"');
      }
    });
    if (stream.hdr == 'PQ') {
      components.push('eotf="smpte2084"');
    }

    return components.join(';');
  }

  /**
   * Takes a full MIME type (with codecs) or basic MIME type (without codecs)
   * and returns a container type string ("mp2t", "mp4", "webm", etc.)
   *
   * @param {string} mimeType
   * @return {string}
   */
  static getContainerType(mimeType) {
    return mimeType.split(';')[0].split('/')[1];
  }

  /**
   * Split a list of codecs encoded in a string into a list of codecs.
   * @param {string} codecs
   * @return {!Array.<string>}
   */
  static splitCodecs(codecs) {
    return codecs.split(',');
  }

  /**
   * Get the base codec from a codec string.
   *
   * @param {string} codecString
   * @return {string}
   */
  static getCodecBase(codecString) {
    const parts = shaka.util.MimeUtils.getCodecParts_(codecString);
    return parts[0];
  }

  /**
   * Takes a full MIME type (with codecs) or basic MIME type (without codecs)
   * and returns a basic MIME type (without codecs or other parameters).
   *
   * @param {string} mimeType
   * @return {string}
   */
  static getBasicType(mimeType) {
    return mimeType.split(';')[0];
  }

  /**
   * Takes a MIME type and returns the codecs parameter, or an empty string if
   * there is no codecs parameter.
   *
   * @param {string} mimeType
   * @return {string}
   */
  static getCodecs(mimeType) {
    // Parse the basic MIME type from its parameters.
    const pieces = mimeType.split(/ *; */);
    pieces.shift();  // Remove basic MIME type from pieces.

    const codecs = pieces.find((piece) => piece.startsWith('codecs='));
    if (!codecs) {
      return '';
    }

    // The value may be quoted, so remove quotes at the beginning or end.
    const value = codecs.split('=')[1].replace(/^"|"$/g, '');
    return value;
  }

  /**
   * Get the base and profile of a codec string. Where [0] will be the codec
   * base and [1] will be the profile.
   * @param {string} codecString
   * @return {!Array.<string>}
   * @private
   */
  static getCodecParts_(codecString) {
    const parts = codecString.split('.');

    const base = parts[0];

    parts.pop();
    const profile = parts.join('.');

    // Make sure that we always return a "base" and "profile".
    return [base, profile];
  }
};


/**
 * A map from Stream object keys to MIME type parameters.  These should be
 * ignored by platforms that do not recognize them.
 *
 * This initial set of parameters are all recognized by Chromecast.
 *
 * @const {!Map.<string, string>}
 * @private
 */
shaka.util.MimeUtils.EXTENDED_MIME_PARAMETERS_ = new Map()
    .set('codecs', 'codecs')
    .set('frameRate', 'framerate')  // Ours is camelCase, theirs is lowercase.
    .set('bandwidth', 'bitrate')  // They are in the same units: bits/sec.
    .set('width', 'width')
    .set('height', 'height')
    .set('channelsCount', 'channels');


/**
 * A mimetype created for CEA-608 closed captions.
 * @const {string}
 */
shaka.util.MimeUtils.CEA608_CLOSED_CAPTION_MIMETYPE = 'application/cea-608';

/**
 * A mimetype created for CEA-708 closed captions.
 * @const {string}
 */
shaka.util.MimeUtils.CEA708_CLOSED_CAPTION_MIMETYPE = 'application/cea-708';

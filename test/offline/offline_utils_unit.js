/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

describe('OfflineUtils', function() {
  const OfflineUri = shaka.offline.OfflineUri;
  const OfflineUtils = shaka.offline.OfflineUtils;

  let drmInfos;
  let timeline;

  beforeEach(function() {
    drmInfos = [{
      keySystem: 'com.example.drm',
      licenseServerUri: 'https://example.com/drm',
      distinctiveIdentifierRequired: false,
      persistentStateRequired: true,
      audioRobustness: 'weak',
      videoRobustness: 'awesome',
      serverCertificate: null,
      initData: [{initData: new Uint8Array([1]), initDataType: 'foo'}],
      keyIds: ['key1', 'key2']
    }];
    timeline = new shaka.media.PresentationTimeline(null, 0);
  });

  describe('recreateVariants', function() {
    const OfflineUtils = shaka.offline.OfflineUtils;

    const audioType = 'audio';
    const videoType = 'video';

    it('will create variants with variant ids', function() {
      /** @type {!Array.<shakaExtern.StreamDB>} */
      let audios = [
        createStreamDB(0, audioType, [0]),
        createStreamDB(1, audioType, [1])
      ];
      /** @type {!Array.<shakaExtern.StreamDB>} */
      let videos = [
        createStreamDB(2, videoType, [0]),
        createStreamDB(3, videoType, [1])
      ];
      /** @type {!Array.<shakaExtern.DrmInfo>} */
      let drm = [];

      /** @type {!Array.<shakaExtern.Variant>} */
      let variants = OfflineUtils.recreateVariants(audios, videos, drm);

      expect(variants.length).toBe(2);

      expect(variants[0].audio.id).toBe(0);
      expect(variants[0].video.id).toBe(2);

      expect(variants[1].audio.id).toBe(1);
      expect(variants[1].video.id).toBe(3);
    });

    it('will create variants when there is only audio', function() {
      /** @type {!Array.<shakaExtern.StreamDB>} */
      let audios = [
        createStreamDB(0, audioType, [0]),
        createStreamDB(1, audioType, [1])
      ];
      /** @type {!Array.<shakaExtern.StreamDB>} */
      let videos = [];
      /** @type {!Array.<shakaExtern.DrmInfo>} */
      let drm = [];

      /** @type {!Array.<shakaExtern.Variant>} */
      let variants = OfflineUtils.recreateVariants(audios, videos, drm);

      expect(variants.length).toBe(2);
    });

    it('will create variants when there is only video', function() {
      /** @type {!Array.<shakaExtern.StreamDB>} */
      let audios = [];
      /** @type {!Array.<shakaExtern.StreamDB>} */
      let videos = [
        createStreamDB(2, videoType, [0]),
        createStreamDB(3, videoType, [1])
      ];
      /** @type {!Array.<shakaExtern.DrmInfo>} */
      let drm = [];

      /** @type {!Array.<shakaExtern.Variant>} */
      let variants = OfflineUtils.recreateVariants(audios, videos, drm);

      expect(variants.length).toBe(2);
    });

    /**
     * @param {number} id
     * @param {string} type
     * @param {!Array.<number>} variants
     * @return {shakaExtern.StreamDB}
     */
    function createStreamDB(id, type, variants) {
      /** @type {shakaExtern.StreamDB} */
      let streamDB = {
        id: id,
        primary: false,
        presentationTimeOffset: 0,
        contentType: type,
        mimeType: '',
        codecs: '',
        language: '',
        label: null,
        width: null,
        height: null,
        initSegmentKey: null,
        encrypted: false,
        keyId: null,
        segments: [],
        variantIds: variants
      };

      return streamDB;
    }
  });

  describe('reconstructPeriod', function() {
    it('will reconstruct Periods correctly', function() {
      /** @type {shakaExtern.PeriodDB} */
      let periodDb = {
        startTime: 60,
        streams: [createVideoStreamDb(1, [0]), createAudioStreamDb(2, [0])]
      };
      let period = OfflineUtils.reconstructPeriod(periodDb, drmInfos, timeline);
      expect(period).toBeTruthy();
      expect(period.startTime).toBe(periodDb.startTime);
      expect(period.textStreams).toEqual([]);
      expect(period.variants.length).toBe(1);

      let variant = period.variants[0];
      expect(variant.id).toEqual(jasmine.any(Number));
      expect(variant.language).toBe(periodDb.streams[1].language);
      expect(variant.primary).toBe(false);
      expect(variant.bandwidth).toEqual(jasmine.any(Number));
      expect(variant.drmInfos).toBe(drmInfos);
      expect(variant.allowedByApplication).toBe(true);
      expect(variant.allowedByKeySystem).toBe(true);

      verifyStream(variant.video, periodDb.streams[0]);
      verifyStream(variant.audio, periodDb.streams[1]);
    });

    it('supports video-only content', function() {
      /** @type {shakaExtern.PeriodDB} */
      let periodDb = {
        startTime: 60,
        streams: [createVideoStreamDb(1, [0]), createVideoStreamDb(2, [1])]
      };

      let period = OfflineUtils.reconstructPeriod(periodDb, drmInfos, timeline);
      expect(period).toBeTruthy();
      expect(period.variants.length).toBe(2);
      expect(period.variants[0].audio).toBe(null);
      expect(period.variants[0].video).toBeTruthy();
    });

    it('supports audio-only content', function() {
      /** @type {shakaExtern.PeriodDB} */
      let periodDb = {
        startTime: 60,
        streams: [createAudioStreamDb(1, [0]), createAudioStreamDb(2, [1])]
      };

      let period = OfflineUtils.reconstructPeriod(periodDb, drmInfos, timeline);
      expect(period).toBeTruthy();
      expect(period.variants.length).toBe(2);
      expect(period.variants[0].audio).toBeTruthy();
      expect(period.variants[0].video).toBe(null);
    });

    it('supports text streams', function() {
      /** @type {shakaExtern.PeriodDB} */
      let periodDb = {
        startTime: 60,
        streams: [
          createVideoStreamDb(1, [0]),
          createTextStreamDb(2)
        ]
      };

      let period = OfflineUtils.reconstructPeriod(periodDb, drmInfos, timeline);
      expect(period).toBeTruthy();
      expect(period.variants.length).toBe(1);
      expect(period.textStreams.length).toBe(1);

      verifyStream(period.textStreams[0], periodDb.streams[1]);
    });

    it('combines Variants according to variantIds field', function() {
      const audio1 = 0;
      const audio2 = 1;
      const video1 = 2;
      const video2 = 3;

      const variant1 = 0;
      const variant2 = 1;
      const variant3 = 2;

      /** @type {shakaExtern.PeriodDB} */
      let periodDb = {
        startTime: 60,
        streams: [
          // Audio
          createAudioStreamDb(audio1, [variant2]),
          createAudioStreamDb(audio2, [variant1, variant3]),

          // Video
          createVideoStreamDb(video1, [variant1]),
          createVideoStreamDb(video2, [variant2, variant3])
        ]
      };

      /** @type {shakaExtern.Period} */
      let period = OfflineUtils.reconstructPeriod(periodDb, drmInfos, timeline);

      expect(period).toBeTruthy();
      expect(period.variants.length).toBe(3);

      // Variant 1
      expect(findVariant(period.variants, audio2, video1)).toBeTruthy();
      // Variant 2
      expect(findVariant(period.variants, audio1, video2)).toBeTruthy();
      // Variant 3
      expect(findVariant(period.variants, audio2, video2)).toBeTruthy();
    });


    /**
     * @param {number} id
     * @param {!Array.<number>} variantIds
     * @return {shakaExtern.StreamDB}
     */
    function createVideoStreamDb(id, variantIds) {
      const ContentType = shaka.util.ManifestParserUtils.ContentType;
      return {
        id: id,
        primary: false,
        presentationTimeOffset: 25,
        contentType: ContentType.VIDEO,
        mimeType: 'video/mp4',
        codecs: 'avc1.42c01e',
        frameRate: 22,
        kind: undefined,
        language: '',
        label: null,
        width: 250,
        height: 100,
        initSegmentKey: null,
        encrypted: true,
        keyId: 'key1',
        segments: [
          createSegment(
              /* start time */ 0,
              /* end time */ 10,
              /* data key */ 1),
          createSegment(
              /* start time */ 10,
              /* end time */ 20,
              /* data key */ 2),
          createSegment(
              /* start time */ 20,
              /* end time */ 25,
              /* data key */ 3)
        ],
        variantIds: variantIds
      };
    }

    /**
     * @param {number} id
     * @param {!Array.<number>} variantIds
     * @return {shakaExtern.StreamDB}
     */
    function createAudioStreamDb(id, variantIds) {
      const ContentType = shaka.util.ManifestParserUtils.ContentType;
      return {
        id: id,
        primary: false,
        presentationTimeOffset: 10,
        contentType: ContentType.AUDIO,
        mimeType: 'audio/mp4',
        codecs: 'mp4a.40.2',
        frameRate: undefined,
        kind: undefined,
        language: 'en',
        label: null,
        width: null,
        height: null,
        initSegmentKey: 0,
        encrypted: false,
        keyId: null,
        segments: [
          createSegment(
              /* start time */ 0,
              /* end time */ 10,
              /* data key */ 1),
          createSegment(
              /* start time */ 10,
              /* end time */ 20,
              /* data key */ 2),
          createSegment(
              /* start time */ 20,
              /* end time */ 25,
              /* data key */ 3)
        ],
        variantIds: variantIds
      };
    }

    /**
     * @param {number} id
     * @return {shakaExtern.StreamDB}
     */
    function createTextStreamDb(id) {
      const ContentType = shaka.util.ManifestParserUtils.ContentType;
      return {
        id: id,
        primary: false,
        presentationTimeOffset: 10,
        contentType: ContentType.TEXT,
        mimeType: 'text/vtt',
        codecs: '',
        frameRate: undefined,
        kind: undefined,
        language: 'en',
        label: null,
        width: null,
        height: null,
        initSegmentKey: 0,
        encrypted: false,
        keyId: null,
        segments: [
          createSegment(
              /* start time */ 0,
              /* end time */ 10,
              /* data key */ 1),
          createSegment(
              /* start time */ 10,
              /* end time */ 20,
              /* data key */ 2),
          createSegment(
              /* start time */ 20,
              /* end time */ 25,
              /* data key */ 3)
        ],
        variantIds: [5]
      };
    }

    /**
     * @param {?shakaExtern.Stream} stream
     * @param {?shakaExtern.StreamDB} streamDb
     */
    function verifyStream(stream, streamDb) {
      if (!streamDb) {
        expect(stream).toBeFalsy();
        return;
      }

      let expectedStream = {
        id: jasmine.any(Number),
        createSegmentIndex: jasmine.any(Function),
        findSegmentPosition: jasmine.any(Function),
        getSegmentReference: jasmine.any(Function),
        initSegmentReference: streamDb.initSegmentKey != null ?
            jasmine.any(shaka.media.InitSegmentReference) :
            null,
        presentationTimeOffset: streamDb.presentationTimeOffset,
        mimeType: streamDb.mimeType,
        codecs: streamDb.codecs,
        frameRate: streamDb.frameRate,
        width: streamDb.width || undefined,
        height: streamDb.height || undefined,
        kind: streamDb.kind,
        encrypted: streamDb.encrypted,
        keyId: streamDb.keyId,
        language: streamDb.language,
        label: streamDb.label,
        type: streamDb.contentType,
        primary: streamDb.primary,
        trickModeVideo: null,
        containsEmsgBoxes: false,
        roles: [],
        channelsCount: null
      };

      expect(stream).toEqual(expectedStream);

      // Assume that we don't have to call createSegmentIndex.

      streamDb.segments.forEach(function(segmentDb, i) {
        /** @type {?string} */
        let uri = OfflineUri.segment(segmentDb.dataKey).toString();

        expect(stream.findSegmentPosition(segmentDb.startTime)).toBe(i);
        expect(stream.findSegmentPosition(segmentDb.endTime - 0.1)).toBe(i);

        /** @type {shaka.media.SegmentReference} */
        let segment = stream.getSegmentReference(i);
        expect(segment).toBeTruthy();
        expect(segment.position).toBe(i);
        expect(segment.startTime).toBe(segmentDb.startTime);
        expect(segment.endTime).toBe(segmentDb.endTime);
        expect(segment.startByte).toBe(0);
        expect(segment.endByte).toBe(null);
        expect(segment.getUris()).toEqual([uri]);
      });
    }

    /**
     * @param {!Array.<shakaExtern.Variant>} variants
     * @param {?number} audioId
     * @param {?number} videoId
     * @return {?shakaExtern.Variant}
     */
    function findVariant(variants, audioId, videoId) {
      /** @type {?shakaExtern.Variant} */
      let found = null;

      variants.forEach(function(variant) {

        /** @type {?shakaExtern.Stream} */
        let audio = variant.audio;
        /** @type {?shakaExtern.Stream} */
        let video = variant.video;

        /** @type {boolean } */
        let audioMatch = audio ? audioId == audio.id : audioId == null;
        /** @type {boolean } */
        let videoMatch = video ? videoId == video.id : videoId == null;

        if (audioMatch && videoMatch) {
          found = variant;
        }
      });

      return found;
    }
  });

  function createSegment(startTime, endTime, dataKey) {
    /** @type {shakaExtern.SegmentDB} */
    let segment = {
      startTime: startTime,
      endTime: endTime,
      dataKey: dataKey
    };

    return segment;
  }
});

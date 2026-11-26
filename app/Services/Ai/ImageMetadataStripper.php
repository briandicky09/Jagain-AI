<?php

namespace App\Services\Ai;

/**
 * Strips EXIF/IPTC/XMP metadata from uploaded images using GD re-encoding
 * before images are forwarded to the AI microservice.
 */
class ImageMetadataStripper
{
    /**
     * Re-encode supported raster images (JPEG/PNG/WebP/GIF) into clean pixel buffers
     * free of EXIF GPS/camera/author metadata. Returns null if the bytes cannot be
     * safely decoded as an image.
     */
    public function strip(string $rawBytes): ?string
    {
        if ($rawBytes === '' || ! function_exists('imagecreatefromstring')) {
            return null;
        }

        $info = @getimagesizefromstring($rawBytes);
        if ($info === false) {
            return null;
        }

        $image = @imagecreatefromstring($rawBytes);
        if ($image === false) {
            return null;
        }

        ob_start();
        try {
            $mime = $info['mime'];
            if ($mime === 'image/png') {
                imagealphablending($image, false);
                imagesavealpha($image, true);
                imagepng($image);
            } elseif ($mime === 'image/webp' && function_exists('imagewebp')) {
                imagewebp($image, null, 90);
            } else {
                imagejpeg($image, null, 90);
            }
            $encoded = ob_get_contents();
        } finally {
            ob_end_clean();
            imagedestroy($image);
        }

        return is_string($encoded) && $encoded !== '' ? $encoded : null;
    }
}

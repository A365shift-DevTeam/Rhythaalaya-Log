using RhythaalayaLog.Application;
using SkiaSharp;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Validates and compresses certificate uploads before they're stored in the database.
/// Images are downsized and re-encoded as JPEG to shrink them aggressively; PDFs are stored
/// as-is (recompressing embedded PDF images needs a heavyweight PDF library) but still size-capped.
/// </summary>
public static class AchievementFileProcessor
{
    private const int MaxImageDimension = 1600;
    private const int JpegQuality = 70;
    private const long MaxImageUploadBytes = 15 * 1024 * 1024;
    private const long MaxPdfUploadBytes = 8 * 1024 * 1024;

    private static readonly HashSet<string> ImageContentTypes =
        new(StringComparer.OrdinalIgnoreCase) { "image/jpeg", "image/jpg", "image/png", "image/webp" };

    public static (byte[] Data, string ContentType) Process(byte[] original, string contentType, long originalLength)
    {
        var type = (contentType ?? string.Empty).Trim().ToLowerInvariant();

        if (type == "application/pdf")
        {
            if (originalLength > MaxPdfUploadBytes)
                throw new AppValidationException("PDF certificates must be 8MB or smaller.");
            return (original, "application/pdf");
        }

        if (ImageContentTypes.Contains(type))
        {
            if (originalLength > MaxImageUploadBytes)
                throw new AppValidationException("Image certificates must be 15MB or smaller.");
            return (CompressImage(original), "image/jpeg");
        }

        throw new AppValidationException("Unsupported file type. Upload a JPG, PNG, WEBP image or a PDF.");
    }

    private static byte[] CompressImage(byte[] original)
    {
        using var bitmap = SKBitmap.Decode(original)
            ?? throw new AppValidationException("That file isn't a readable image.");

        var scale = Math.Min(1.0, (double)MaxImageDimension / Math.Max(bitmap.Width, bitmap.Height));

        SKBitmap? resizedOwned = null;
        try
        {
            SKBitmap source = bitmap;
            if (scale < 1.0)
            {
                var targetWidth = Math.Max(1, (int)Math.Round(bitmap.Width * scale));
                var targetHeight = Math.Max(1, (int)Math.Round(bitmap.Height * scale));
                resizedOwned = bitmap.Resize(new SKImageInfo(targetWidth, targetHeight), SKSamplingOptions.Default)
                    ?? throw new AppValidationException("Could not process that image.");
                source = resizedOwned;
            }

            using var image = SKImage.FromBitmap(source);
            using var encoded = image.Encode(SKEncodedImageFormat.Jpeg, JpegQuality);
            return encoded.ToArray();
        }
        finally
        {
            resizedOwned?.Dispose();
        }
    }
}

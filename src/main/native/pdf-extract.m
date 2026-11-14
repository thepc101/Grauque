#import <Foundation/Foundation.h>
#import <PDFKit/PDFKit.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        if (argc < 2) {
            fprintf(stderr, "Usage: pdf-extract <pdf-path> [max-pages]\n");
            return 1;
        }

        NSString *filePath = [NSString stringWithUTF8String:argv[1]];
        NSUInteger maxPages = 0; // 0 means all
        if (argc >= 3) {
            maxPages = (NSUInteger)atoi(argv[2]);
        }

        NSFileManager *fm = [NSFileManager defaultManager];
        if (![fm fileExistsAtPath:filePath]) {
            NSDictionary *errDict = @{
                @"success": @NO,
                @"error": [NSString stringWithFormat:@"File does not exist: %@", filePath]
            };
            NSData *jsonData = [NSJSONSerialization dataWithJSONObject:errDict options:0 error:nil];
            printf("%s\n", (const char *)[jsonData bytes]);
            return 1;
        }

        NSURL *fileURL = [NSURL fileURLWithPath:filePath];
        PDFDocument *pdfDoc = [[PDFDocument alloc] initWithURL:fileURL];
        if (!pdfDoc) {
            NSDictionary *errDict = @{
                @"success": @NO,
                @"error": @"Unable to parse PDF document. It may be corrupt or encrypted."
            };
            NSData *jsonData = [NSJSONSerialization dataWithJSONObject:errDict options:0 error:nil];
            printf("%s\n", (const char *)[jsonData bytes]);
            return 1;
        }

        NSUInteger totalPages = [pdfDoc pageCount];
        NSUInteger pagesToProcess = totalPages;
        if (maxPages > 0 && maxPages < totalPages) {
            pagesToProcess = maxPages;
        }

        NSMutableArray *pagesArray = [NSMutableArray arrayWithCapacity:pagesToProcess];
        NSMutableString *fullText = [NSMutableString string];
        NSUInteger totalCharacters = 0;

        for (NSUInteger i = 0; i < pagesToProcess; i++) {
            PDFPage *page = [pdfDoc pageAtIndex:i];
            NSString *pageStr = [page string] ?: @"";
            
            // Trim excessive blank lines
            NSString *cleanPageStr = [pageStr stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
            
            totalCharacters += [cleanPageStr length];
            [pagesArray addObject:@{
                @"page": @(i + 1),
                @"characters": @([cleanPageStr length]),
                @"text": cleanPageStr
            }];

            if (i > 0) {
                [fullText appendString:@"\n\n"];
            }
            [fullText appendFormat:@"--- PAGE %lu ---\n%@", (unsigned long)(i + 1), cleanPageStr];
        }

        NSDictionary *docAttributes = [pdfDoc documentAttributes];
        NSString *title = docAttributes[PDFDocumentTitleAttribute] ?: [filePath lastPathComponent];
        NSString *author = docAttributes[PDFDocumentAuthorAttribute] ?: @"";

        NSDictionary *result = @{
            @"success": @YES,
            @"title": title,
            @"author": author,
            @"totalPages": @(totalPages),
            @"processedPages": @(pagesToProcess),
            @"characterCount": @(totalCharacters),
            @"text": fullText,
            @"pages": pagesArray
        };

        NSError *jsonErr = nil;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:result options:0 error:&jsonErr];
        if (jsonErr || !jsonData) {
            fprintf(stderr, "JSON serialization error: %s\n", [[jsonErr localizedDescription] UTF8String]);
            return 1;
        }

        fwrite([jsonData bytes], 1, [jsonData length], stdout);
        printf("\n");
        return 0;
    }
}

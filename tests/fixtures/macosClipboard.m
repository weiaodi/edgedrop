// Independent AppKit fixture for packaged-app acceptance. Also preserves the
// user's complete pasteboard (all items and format bytes) around the test.
#import <AppKit/AppKit.h>
int main(int argc, const char **argv) {
    @autoreleasepool {
        if (argc < 3) return 2;
        NSString *command = @(argv[1]), *path = @(argv[2]);
        NSPasteboard *pb = NSPasteboard.generalPasteboard;
        if ([command isEqual:@"snapshot"]) {
            NSMutableArray *items = [NSMutableArray array];
            for (NSPasteboardItem *item in pb.pasteboardItems) {
                NSMutableDictionary *formats = [NSMutableDictionary dictionary];
                for (NSString *type in item.types) {
                    NSData *data = [item dataForType:type];
                    if (data) formats[type] = data;
                }
                [items addObject:formats];
            }
            return [items writeToFile:path atomically:YES] ? 0 : 1;
        }
        if ([command isEqual:@"restore"]) {
            NSArray *snapshot = [NSArray arrayWithContentsOfFile:path];
            if (!snapshot) return 1;
            NSMutableArray *items = [NSMutableArray array];
            for (NSDictionary *formats in snapshot) {
                NSPasteboardItem *item = [NSPasteboardItem new];
                for (NSString *type in formats) [item setData:formats[type] forType:type];
                [items addObject:item];
            }
            [pb clearContents];
            return !items.count || [pb writeObjects:items] ? 0 : 1;
        }
        if ([command isEqual:@"files"]) {
            NSMutableArray *items = [NSMutableArray array];
            for (int i = 2; i < argc; i++) {
                NSPasteboardItem *item = [NSPasteboardItem new];
                [item setString:[NSURL fileURLWithPath:@(argv[i])].absoluteString forType:NSPasteboardTypeFileURL];
                [items addObject:item];
            }
            [pb clearContents];
            BOOL ok = [pb writeObjects:items];
            for (NSPasteboardItem *item in pb.pasteboardItems)
                for (NSString *type in item.types) (void)[item dataForType:type];
            return ok ? 0 : 1;
        }
        if ([command isEqual:@"private"]) {
            NSPasteboardItem *item = [NSPasteboardItem new];
            [item setString:path forType:NSPasteboardTypeString];
            [item setData:[NSData data] forType:@"org.nspasteboard.ConcealedType"];
            [pb clearContents];
            return [pb writeObjects:@[item]] ? 0 : 1;
        }
        if ([command isEqual:@"image"]) {
            NSImage *image = [[NSImage alloc] initWithContentsOfFile:path];
            if (!image) return 1;
            [pb clearContents];
            return [pb writeObjects:@[image]] ? 0 : 1;
        }
        if ([command isEqual:@"read-files"]) {
            NSArray<NSURL *> *urls = [pb readObjectsForClasses:@[NSURL.class]
                options:@{NSPasteboardURLReadingFileURLsOnlyKey: @YES}];
            NSMutableArray *paths = [NSMutableArray array];
            for (NSURL *url in urls) if (url.path) [paths addObject:url.path];
            NSData *json = [NSJSONSerialization dataWithJSONObject:paths options:0 error:nil];
            puts([[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding].UTF8String);
            return 0;
        }
        return 2;
    }
}

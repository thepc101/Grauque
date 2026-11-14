#import <Cocoa/Cocoa.h>
#import <ApplicationServices/ApplicationServices.h>

@interface OptionKeyDetector : NSObject
@property (nonatomic, assign) uint64_t lastOptionDownTime;
@property (nonatomic, assign) BOOL optionIsDown;
@end

@implementation OptionKeyDetector

- (instancetype)init {
    self = [super init];
    if (self) {
        _lastOptionDownTime = 0;
        _optionIsDown = NO;
    }
    return self;
}

- (void)handleFlagsChanged:(NSEvent *)event {
    NSUInteger flags = [event modifierFlags];
    BOOL isOption = (flags & NSEventModifierFlagOption) != 0;
    
    // Check if other modifiers are pressed (Cmd, Ctrl, Shift)
    BOOL otherModifiers = (flags & (NSEventModifierFlagCommand | NSEventModifierFlagControl | NSEventModifierFlagShift)) != 0;
    if (otherModifiers) {
        _optionIsDown = NO;
        _lastOptionDownTime = 0;
        return;
    }
    
    uint64_t now = (uint64_t)([[NSDate date] timeIntervalSince1970] * 1000.0);
    
    if (isOption && !_optionIsDown) {
        // Option key pressed down
        _optionIsDown = YES;
        uint64_t diff = now - _lastOptionDownTime;
        if (diff >= 60 && diff <= 450) {
            // Double-tap detected!
            printf("DOUBLE_OPTION\n");
            fflush(stdout);
            _lastOptionDownTime = 0;
        } else {
            _lastOptionDownTime = now;
        }
    } else if (!isOption && _optionIsDown) {
        // Option key released
        _optionIsDown = NO;
    }
}

- (void)handleKeyDown:(NSEvent *)event {
    // Any regular key pressed breaks the double-tap sequence
    _lastOptionDownTime = 0;
    _optionIsDown = NO;
}

@end

// Also support CGEventTap for lowest latency and maximum reliability
static CGEventRef eventTapCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
    OptionKeyDetector *detector = (__bridge OptionKeyDetector *)refcon;
    
    if (type == kCGEventFlagsChanged) {
        CGEventFlags flags = CGEventGetFlags(event);
        BOOL isOption = (flags & kCGEventFlagMaskAlternate) != 0;
        BOOL otherModifiers = (flags & (kCGEventFlagMaskCommand | kCGEventFlagMaskControl | kCGEventFlagMaskShift)) != 0;
        
        if (otherModifiers) {
            detector.optionIsDown = NO;
            detector.lastOptionDownTime = 0;
            return event;
        }
        
        uint64_t now = (uint64_t)([[NSDate date] timeIntervalSince1970] * 1000.0);
        
        if (isOption && !detector.optionIsDown) {
            detector.optionIsDown = YES;
            uint64_t diff = now - detector.lastOptionDownTime;
            if (diff >= 60 && diff <= 450) {
                printf("DOUBLE_OPTION\n");
                fflush(stdout);
                detector.lastOptionDownTime = 0;
            } else {
                detector.lastOptionDownTime = now;
            }
        } else if (!isOption && detector.optionIsDown) {
            detector.optionIsDown = NO;
        }
    } else if (type == kCGEventKeyDown) {
        detector.lastOptionDownTime = 0;
        detector.optionIsDown = NO;
    }
    
    return event;
}

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        BOOL prompt = NO;
        for (int i = 1; i < argc; i++) {
            if (strcmp(argv[i], "--prompt-ax") == 0) {
                prompt = YES;
            }
        }
        
        NSDictionary *options = @{(__bridge id)kAXTrustedCheckOptionPrompt: prompt ? @YES : @NO};
        BOOL trusted = AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);
        
        if (trusted) {
            printf("STATUS:TRUSTED\n");
        } else {
            printf("STATUS:UNTRUSTED\n");
        }
        fflush(stdout);
        
        OptionKeyDetector *detector = [[OptionKeyDetector alloc] init];
        
        // Try CGEventTap first
        CGEventMask mask = CGEventMaskBit(kCGEventFlagsChanged) | CGEventMaskBit(kCGEventKeyDown);
        CFMachPortRef eventTap = CGEventTapCreate(
            kCGSessionEventTap,
            kCGHeadInsertEventTap,
            kCGEventTapOptionListenOnly,
            mask,
            eventTapCallback,
            (__bridge void *)detector
        );
        
        if (eventTap) {
            CFRunLoopSourceRef runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0);
            CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, kCFRunLoopCommonModes);
            CGEventTapEnable(eventTap, true);
            printf("LISTENER_RUNNING:CGEVENT\n");
            fflush(stdout);
        } else {
            // Fallback to NSEvent global monitor
            [NSEvent addGlobalMonitorForEventsMatchingMask:NSEventMaskFlagsChanged handler:^(NSEvent *event) {
                [detector handleFlagsChanged:event];
            }];
            [NSEvent addGlobalMonitorForEventsMatchingMask:NSEventMaskKeyDown handler:^(NSEvent *event) {
                [detector handleKeyDown:event];
            }];
            printf("LISTENER_RUNNING:NSEVENT\n");
            fflush(stdout);
        }
        
        [[NSRunLoop currentRunLoop] run];
    }
    return 0;
}

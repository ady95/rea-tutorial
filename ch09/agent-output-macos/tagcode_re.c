/* tagcode_re.c — SPEC.md 기반 재구현 */
#include <stdio.h>
#include <stdint.h>

int main(int argc, char **argv) {
    if (argc < 2) {
        puts("usage: tagcode <text>");
        return 1;
    }
    const unsigned char *p = (const unsigned char *)argv[1];
    uint32_t code;
    const char *grade;

    if (*p == '\0') {
        code = 0x1234;
        grade = "SILVER";
    } else {
        uint32_t h = 0x1234;
        for (; *p; ++p) {
            h = h * 31u + *p;
            h ^= h >> 7;
        }
        code = h % 10000u;
        uint32_t t = code >> 3;
        if (t > 1124)       grade = "PLATINUM";
        else if (t > 874)   grade = "GOLD";
        else if (code > 3999) grade = "SILVER";
        else                grade = "BRONZE";
    }
    printf("code=%04u grade=%s\n", code, grade);
    return 0;
}

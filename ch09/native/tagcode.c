#include <stdio.h>
#include <string.h>

/* 문자열에서 4자리 태그 코드를 만든다 */
static unsigned int tag_hash(const char *text)
{
    unsigned int h = 0x1234u;
    for (const unsigned char *p = (const unsigned char *)text; *p; p++) {
        h = h * 31u + *p;
        h ^= h >> 7;
    }
    return h % 10000u;
}

/* 태그 코드로 등급을 정한다 */
static const char *tag_grade(unsigned int code)
{
    if (code >= 9000u) return "PLATINUM";
    if (code >= 7000u) return "GOLD";
    if (code >= 4000u) return "SILVER";
    return "BRONZE";
}

int main(int argc, char **argv)
{
    if (argc < 2) {
        printf("usage: tagcode <text>\n");
        return 1;
    }
    unsigned int code = tag_hash(argv[1]);
    printf("code=%04u grade=%s\n", code, tag_grade(code));
    return 0;
}

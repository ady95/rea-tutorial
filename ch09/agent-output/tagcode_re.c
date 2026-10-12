/* tagcode_re.c - reimplementation of tagcode.exe from the REA behavior spec */
#include <stdio.h>

int main(int argc, char **argv)
{
    const unsigned char *p;
    const char *grade;
    unsigned int h;

    if (argc < 2) {
        puts("usage: tagcode <text>");
        return 1;
    }

    p = (const unsigned char *)argv[1];
    h = 0x1234;
    while (*p) {
        h = h * 31u + *p++;
        h ^= h >> 7;
    }
    h %= 10000u;

    if (h >= 9000)
        grade = "PLATINUM";
    else if (h >= 7000)
        grade = "GOLD";
    else if (h >= 4000)
        grade = "SILVER";
    else
        grade = "BRONZE";

    printf("code=%04u grade=%s\n", h, grade);
    return 0;
}

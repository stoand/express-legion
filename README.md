# Test-Legion

Run Typescript/Javascript Tests in Parallel.

Based on Bun.

Every test is completely isolated - even having its own DB instance.

    ONLY SUPPORTS POSTGRESQL FOR NOW!

## Connecting to a Database

`psql -p 20100 -h 127.0.0.1 -d postgres`

or

`psql "postgresql://127.0.0.1:20102/postgres"`
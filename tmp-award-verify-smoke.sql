select count(*)::int as n
from public."CompanyBadge"
where "companyId" = '746b2c20-4487-4da7-a76d-cc60cb546c9c';

select "id","badgeId","moduleId","awardedAt"
from public."CompanyBadge"
where "companyId" = '746b2c20-4487-4da7-a76d-cc60cb546c9c'
order by "awardedAt" desc;

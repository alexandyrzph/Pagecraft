"use client";

import {
  AddDomainForm,
  DomainCard,
  DomainsEmptyState,
  useDomainsManager,
} from "./DomainsManager.parts";

export function DomainsManager({ canManage }: { canManage: boolean }) {
  const { domains, hostname, setHostname, adding, addErr, verifyingId, add, verify, remove } =
    useDomainsManager();

  return (
    <div className="space-y-5">
      {canManage && (
        <AddDomainForm
          hostname={hostname}
          setHostname={setHostname}
          adding={adding}
          addErr={addErr}
          onSubmit={add}
        />
      )}

      {domains.length === 0 ? (
        <DomainsEmptyState canManage={canManage} />
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <DomainCard
              key={d.id}
              domain={d}
              canManage={canManage}
              verifyingId={verifyingId}
              onVerify={verify}
              onRemove={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
